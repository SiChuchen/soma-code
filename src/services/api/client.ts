import Anthropic, { type ClientOptions } from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getAnthropicApiKey,
  getApiKeyFromApiKeyHelper,
  getClaudeAIOAuthTokens,
  isClaudeAISubscriber,
  refreshAndGetAwsCredentials,
  refreshGcpCredentialsIfNeeded,
} from 'src/utils/auth.js'
import { getUserAgent } from 'src/utils/http.js'
import { resolveInferenceClientDescriptor } from 'src/utils/inference/clientFactory.js'
import { getSmallFastModel } from 'src/utils/model/model.js'
import { getProxyFetchOptions } from 'src/utils/proxy.js'
import {
  getIsNonInteractiveSession,
  getSessionId,
} from '../../bootstrap/state.js'
import { getOauthConfig } from '../../constants/oauth.js'
import { isDebugToStdErr, logForDebugging } from '../../utils/debug.js'
import {
  getAWSRegion,
  getVertexRegionForModel,
  isEnvTruthy,
} from '../../utils/envUtils.js'
import {
  buildOpenAICompatFetch,
  getOpenAICompatApiKey,
  getOpenAICompatBaseUrl,
} from './openaiCompat.js'

/**
 * Environment variables for different client types:
 *
 * Direct API:
 * - ANTHROPIC_API_KEY: Required for direct API access
 *
 * AWS Bedrock:
 * - AWS credentials configured via aws-sdk defaults
 * - AWS_REGION or AWS_DEFAULT_REGION: Sets the AWS region for all models (default: us-east-1)
 * - ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION: Optional. Override AWS region specifically for the small fast model (Haiku)
 *
 * Foundry (Azure):
 * - ANTHROPIC_FOUNDRY_RESOURCE: Your Azure resource name (e.g., 'my-resource')
 *   For the full endpoint: https://{resource}.services.ai.azure.com/anthropic/v1/messages
 * - ANTHROPIC_FOUNDRY_BASE_URL: Optional. Alternative to resource - provide full base URL directly
 *   (e.g., 'https://my-resource.services.ai.azure.com')
 *
 * Authentication (one of the following):
 * - ANTHROPIC_FOUNDRY_API_KEY: Your Microsoft Foundry API key (if using API key auth)
 * - Azure AD authentication: If no API key is provided, uses DefaultAzureCredential
 *   which supports multiple auth methods (environment variables, managed identity,
 *   Azure CLI, etc.). See: https://docs.microsoft.com/en-us/javascript/api/@azure/identity
 *
 * Vertex AI:
 * - Model-specific region variables (highest priority):
 *   - VERTEX_REGION_CLAUDE_3_5_HAIKU: Region for Claude 3.5 Haiku model
 *   - VERTEX_REGION_CLAUDE_HAIKU_4_5: Region for Claude Haiku 4.5 model
 *   - VERTEX_REGION_CLAUDE_3_5_SONNET: Region for Claude 3.5 Sonnet model
 *   - VERTEX_REGION_CLAUDE_3_7_SONNET: Region for Claude 3.7 Sonnet model
 * - CLOUD_ML_REGION: Optional. The default GCP region to use for all models
 *   If specific model region not specified above
 * - ANTHROPIC_VERTEX_PROJECT_ID: Required. Your GCP project ID
 * - Standard GCP credentials configured via google-auth-library
 *
 * Priority for determining region:
 * 1. Hardcoded model-specific environment variables
 * 2. Global CLOUD_ML_REGION variable
 * 3. Default region from config
 * 4. Fallback region (us-east5)
 */

function createStderrLogger(): ClientOptions['logger'] {
  return {
    error: (msg, ...args) =>
      // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
      console.error('[Anthropic SDK ERROR]', msg, ...args),
    // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
    warn: (msg, ...args) => console.error('[Anthropic SDK WARN]', msg, ...args),
    // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
    info: (msg, ...args) => console.error('[Anthropic SDK INFO]', msg, ...args),
    debug: (msg, ...args) =>
      // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
      console.error('[Anthropic SDK DEBUG]', msg, ...args),
  }
}

function getVertexRegionForInferenceModel(
  model: string | undefined,
  configuredRegion: string | undefined,
): string | undefined {
  const resolvedRegion = getVertexRegionForModel(model)
  const defaultRegion = process.env.CLOUD_ML_REGION || 'us-east5'

  return resolvedRegion !== defaultRegion
    ? resolvedRegion
    : configuredRegion ?? resolvedRegion
}

export async function getAnthropicClient({
  apiKey,
  maxRetries,
  model,
  fetchOverride,
  source,
}: {
  apiKey?: string
  maxRetries: number
  model?: string
  fetchOverride?: ClientOptions['fetch']
  source?: string
}): Promise<Anthropic> {
  const containerId = process.env.CLAUDE_CODE_CONTAINER_ID
  const remoteSessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID
  const clientApp = process.env.CLAUDE_AGENT_SDK_CLIENT_APP
  const customHeaders = getCustomHeaders()
  const defaultHeaders: { [key: string]: string } = {
    'x-app': 'cli',
    'User-Agent': getUserAgent(),
    'X-Claude-Code-Session-Id': getSessionId(),
    ...customHeaders,
    ...(containerId ? { 'x-claude-remote-container-id': containerId } : {}),
    ...(remoteSessionId
      ? { 'x-claude-remote-session-id': remoteSessionId }
      : {}),
    // SDK consumers can identify their app/library for backend analytics
    ...(clientApp ? { 'x-client-app': clientApp } : {}),
  }

  // Log API client configuration for HFI debugging
  logForDebugging(
    `[API:request] Creating client, ANTHROPIC_CUSTOM_HEADERS present: ${!!process.env.ANTHROPIC_CUSTOM_HEADERS}, has Authorization header: ${!!customHeaders['Authorization']}`,
  )

  // Add additional protection header if enabled via env var
  const additionalProtectionEnabled = isEnvTruthy(
    process.env.CLAUDE_CODE_ADDITIONAL_PROTECTION,
  )
  if (additionalProtectionEnabled) {
    defaultHeaders['x-anthropic-additional-protection'] = 'true'
  }

  logForDebugging('[API:auth] OAuth token check starting')
  await checkAndRefreshOAuthTokenIfNeeded()
  logForDebugging('[API:auth] OAuth token check complete')

  if (!isClaudeAISubscriber()) {
    await configureApiKeyHeaders(defaultHeaders, getIsNonInteractiveSession())
  }

  const descriptor = resolveInferenceClientDescriptor({ model })
  const openAICompatConfig = descriptor.openAICompat
    ? {
        ...descriptor.openAICompat,
        apiKey:
          apiKey ||
          getOpenAICompatApiKey(descriptor.openAICompat) ||
          getAnthropicApiKey() ||
          'openai-compat',
      }
    : undefined
  const resolvedFetch = buildFetch(
    fetchOverride,
    source,
    descriptor,
    openAICompatConfig,
  )

  const ARGS = {
    defaultHeaders,
    maxRetries,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    fetchOptions: getProxyFetchOptions({
      forAnthropicAPI: true,
    }) as ClientOptions['fetchOptions'],
    ...(resolvedFetch && {
      fetch: resolvedFetch,
    }),
  }
  if (descriptor.transportConfig.kind === 'bedrock') {
    const { AnthropicBedrock } = await import('@anthropic-ai/bedrock-sdk')
    type BedrockClientOptions = import('@anthropic-ai/bedrock-sdk/client').ClientOptions
    type BedrockStaticCredsArgs = BedrockClientOptions & {
      awsAccessKey: string
      awsSecretKey: string
      awsSessionToken?: string | null
    }
    type BedrockNoStaticCredsArgs = BedrockClientOptions & {
      awsAccessKey?: null
      awsSecretKey?: null
      awsSessionToken?: null
    }
    // Use region override for small fast model if specified
    const awsRegion =
      model === getSmallFastModel() &&
      process.env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION
        ? process.env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION
        : descriptor.transportConfig.awsRegion ?? getAWSRegion()

    const skipBedrockAuth = descriptor.transportConfig.skipAuth
    const baseBedrockArgs = {
      ...ARGS,
      awsRegion,
      ...(descriptor.transportConfig.baseUrl
        ? { baseURL: descriptor.transportConfig.baseUrl }
        : {}),
      ...(isDebugToStdErr() && { logger: createStderrLogger() }),
    }
    const cachedCredentials =
      process.env.AWS_BEARER_TOKEN_BEDROCK || skipBedrockAuth
        ? null
        : await refreshAndGetAwsCredentials()

    if (process.env.AWS_BEARER_TOKEN_BEDROCK) {
      const bedrockArgs: BedrockNoStaticCredsArgs = {
        ...baseBedrockArgs,
        awsAccessKey: null,
        awsSecretKey: null,
        awsSessionToken: null,
        skipAuth: true,
        defaultHeaders: {
          ...baseBedrockArgs.defaultHeaders,
          Authorization: `Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK}`,
        },
      }
      // we have always been lying about the return type - this doesn't support batching or models
      return new AnthropicBedrock(bedrockArgs) as unknown as Anthropic
    }

    if (skipBedrockAuth) {
      const bedrockArgs: BedrockNoStaticCredsArgs = {
        ...baseBedrockArgs,
        awsAccessKey: null,
        awsSecretKey: null,
        awsSessionToken: null,
        skipAuth: true,
      }
      // we have always been lying about the return type - this doesn't support batching or models
      return new AnthropicBedrock(bedrockArgs) as unknown as Anthropic
    }

    if (cachedCredentials) {
      const bedrockArgs: BedrockStaticCredsArgs = {
        ...baseBedrockArgs,
        awsAccessKey: cachedCredentials.accessKeyId,
        awsSecretKey: cachedCredentials.secretAccessKey,
        awsSessionToken: cachedCredentials.sessionToken,
      }
      // we have always been lying about the return type - this doesn't support batching or models
      return new AnthropicBedrock(bedrockArgs) as unknown as Anthropic
    }

    const bedrockArgs: BedrockNoStaticCredsArgs = {
      ...baseBedrockArgs,
      awsAccessKey: null,
      awsSecretKey: null,
      awsSessionToken: null,
    }

    // we have always been lying about the return type - this doesn't support batching or models
    return new AnthropicBedrock(bedrockArgs) as unknown as Anthropic
  }
  if (descriptor.transportConfig.kind === 'foundry') {
    const { AnthropicFoundry } = await import('@anthropic-ai/foundry-sdk')
    // Determine Azure AD token provider based on configuration
    // SDK reads ANTHROPIC_FOUNDRY_API_KEY by default
    const foundryApiKey =
      apiKey ?? descriptor.endpointApiKey ?? process.env.ANTHROPIC_FOUNDRY_API_KEY
    let azureADTokenProvider: (() => Promise<string>) | undefined
    if (!foundryApiKey) {
      if (descriptor.transportConfig.skipAuth) {
        // Mock token provider for testing/proxy scenarios (similar to Vertex mock GoogleAuth)
        azureADTokenProvider = () => Promise.resolve('')
      } else {
        // Use real Azure AD authentication with DefaultAzureCredential
        const {
          DefaultAzureCredential: AzureCredential,
          getBearerTokenProvider,
        } = await import('@azure/identity')
        azureADTokenProvider = getBearerTokenProvider(
          new AzureCredential(),
          'https://cognitiveservices.azure.com/.default',
        )
      }
    }

    const foundryArgs: ConstructorParameters<typeof AnthropicFoundry>[0] = {
      ...ARGS,
      ...(foundryApiKey ? { apiKey: foundryApiKey } : {}),
      ...(descriptor.transportConfig.baseUrl
        ? { baseURL: descriptor.transportConfig.baseUrl }
        : descriptor.transportConfig.resource
          ? { resource: descriptor.transportConfig.resource }
          : {}),
      ...(azureADTokenProvider && { azureADTokenProvider }),
      ...(isDebugToStdErr() && { logger: createStderrLogger() }),
    }
    // we have always been lying about the return type - this doesn't support batching or models
    return new AnthropicFoundry(foundryArgs) as unknown as Anthropic
  }
  if (descriptor.transportConfig.kind === 'vertex') {
    // Refresh GCP credentials if gcpAuthRefresh is configured and credentials are expired
    // This is similar to how we handle AWS credential refresh for Bedrock
    if (!descriptor.transportConfig.skipAuth) {
      await refreshGcpCredentialsIfNeeded()
    }

    const [{ AnthropicVertex }, { GoogleAuth }] = await Promise.all([
      import('@anthropic-ai/vertex-sdk'),
      import('google-auth-library'),
    ])
    type VertexArgs = NonNullable<ConstructorParameters<typeof AnthropicVertex>[0]>
    type VertexGoogleAuth = NonNullable<VertexArgs['googleAuth']>
    // TODO: Cache either GoogleAuth instance or AuthClient to improve performance
    // Currently we create a new GoogleAuth instance for every getAnthropicClient() call
    // This could cause repeated authentication flows and metadata server checks
    // However, caching needs careful handling of:
    // - Credential refresh/expiration
    // - Environment variable changes (GOOGLE_APPLICATION_CREDENTIALS, project vars)
    // - Cross-request auth state management
    // See: https://github.com/googleapis/google-auth-library-nodejs/issues/390 for caching challenges

    // Prevent metadata server timeout by providing projectId as fallback
    // google-auth-library checks project ID in this order:
    // 1. Environment variables (GCLOUD_PROJECT, GOOGLE_CLOUD_PROJECT, etc.)
    // 2. Credential files (service account JSON, ADC file)
    // 3. gcloud config
    // 4. GCE metadata server (causes 12s timeout outside GCP)
    //
    // We only set projectId if user hasn't configured other discovery methods
    // to avoid interfering with their existing auth setup

    // Check project environment variables in same order as google-auth-library
    // See: https://github.com/googleapis/google-auth-library-nodejs/blob/main/src/auth/googleauth.ts
    const hasProjectEnvVar =
      process.env['GCLOUD_PROJECT'] ||
      process.env['GOOGLE_CLOUD_PROJECT'] ||
      process.env['gcloud_project'] ||
      process.env['google_cloud_project']

    // Check for credential file paths (service account or ADC)
    // Note: We're checking both standard and lowercase variants to be safe,
    // though we should verify what google-auth-library actually checks
    const hasKeyFile =
      process.env['GOOGLE_APPLICATION_CREDENTIALS'] ||
      process.env['google_application_credentials']

    const vertexProjectId =
      descriptor.transportConfig.projectId ?? process.env.ANTHROPIC_VERTEX_PROJECT_ID
    const googleAuth: VertexGoogleAuth = descriptor.transportConfig.skipAuth
      ? ({
          // Mock GoogleAuth for testing/proxy scenarios
          getClient: () => ({
            getRequestHeaders: () => ({}),
          }),
        } as unknown as VertexGoogleAuth)
      : new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
          // Only use ANTHROPIC_VERTEX_PROJECT_ID as last resort fallback
          // This prevents the 12-second metadata server timeout when:
          // - No project env vars are set AND
          // - No credential keyfile is specified AND
          // - ADC file exists but lacks project_id field
          //
          // Risk: If auth project != API target project, this could cause billing/audit issues
          // Mitigation: Users can set GOOGLE_CLOUD_PROJECT to override
          ...(hasProjectEnvVar || hasKeyFile
            ? {}
            : {
                projectId: vertexProjectId,
              }),
        } as ConstructorParameters<typeof GoogleAuth>[0]) as unknown as VertexGoogleAuth

    const vertexArgs: VertexArgs = {
      ...ARGS,
      ...(descriptor.transportConfig.baseUrl
        ? { baseURL: descriptor.transportConfig.baseUrl }
        : {}),
      ...(vertexProjectId ? { projectId: vertexProjectId } : {}),
      region: getVertexRegionForInferenceModel(
        model,
        descriptor.transportConfig.region,
      ),
      googleAuth,
      ...(isDebugToStdErr() && { logger: createStderrLogger() }),
    }
    // we have always been lying about the return type - this doesn't support batching or models
    return new AnthropicVertex(vertexArgs) as unknown as Anthropic
  }

  const directBaseUrl =
    descriptor.provider === 'openaiCompatible'
      ? getOpenAICompatBaseUrl(openAICompatConfig)
      : process.env.USER_TYPE === 'ant' &&
          isEnvTruthy(process.env.USE_STAGING_OAUTH) &&
          descriptor.transportConfig.kind === 'direct' &&
          descriptor.transportConfig.isFirstPartyAnthropicBaseUrl
        ? getOauthConfig().BASE_API_URL
        : descriptor.transportConfig.kind === 'direct'
          ? descriptor.transportConfig.baseUrl
          : undefined

  // Determine authentication method based on available tokens
  const clientConfig: ConstructorParameters<typeof Anthropic>[0] = {
    apiKey:
      descriptor.provider === 'openaiCompatible'
        ? openAICompatConfig?.apiKey || 'openai-compat'
        : isClaudeAISubscriber()
          ? null
          : apiKey || descriptor.endpointApiKey || getAnthropicApiKey(),
    authToken: isClaudeAISubscriber()
      ? getClaudeAIOAuthTokens()?.accessToken
      : undefined,
    ...(directBaseUrl ? { baseURL: directBaseUrl } : {}),
    ...ARGS,
    ...(isDebugToStdErr() && { logger: createStderrLogger() }),
  }

  return new Anthropic(clientConfig)
}

async function configureApiKeyHeaders(
  headers: Record<string, string>,
  isNonInteractiveSession: boolean,
): Promise<void> {
  const token =
    process.env.ANTHROPIC_AUTH_TOKEN ||
    (await getApiKeyFromApiKeyHelper(isNonInteractiveSession))
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
}

function getCustomHeaders(): Record<string, string> {
  const customHeaders: Record<string, string> = {}
  const customHeadersEnv = process.env.ANTHROPIC_CUSTOM_HEADERS

  if (!customHeadersEnv) return customHeaders

  // Split by newlines to support multiple headers
  const headerStrings = customHeadersEnv.split(/\n|\r\n/)

  for (const headerString of headerStrings) {
    if (!headerString.trim()) continue

    // Parse header in format "Name: Value" (curl style). Split on first `:`
    // then trim — avoids regex backtracking on malformed long header lines.
    const colonIdx = headerString.indexOf(':')
    if (colonIdx === -1) continue
    const name = headerString.slice(0, colonIdx).trim()
    const value = headerString.slice(colonIdx + 1).trim()
    if (name) {
      customHeaders[name] = value
    }
  }

  return customHeaders
}

export const CLIENT_REQUEST_ID_HEADER = 'x-client-request-id'

function buildFetch(
  fetchOverride: ClientOptions['fetch'],
  source: string | undefined,
  descriptor: ReturnType<typeof resolveInferenceClientDescriptor>,
  openAICompatConfig?: Parameters<typeof buildOpenAICompatFetch>[2],
): ClientOptions['fetch'] {
  // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
  const inner = fetchOverride ?? globalThis.fetch
  if (descriptor.provider === 'openaiCompatible') {
    return buildOpenAICompatFetch(inner, source, openAICompatConfig)
  }
  // Only send to the first-party API — Bedrock/Vertex/Foundry don't log it
  // and unknown headers risk rejection by strict proxies (inc-4029 class).
  const injectClientRequestId =
    descriptor.provider === 'firstParty' &&
    descriptor.transportConfig.kind === 'direct' &&
    descriptor.transportConfig.isFirstPartyAnthropicBaseUrl
  return (input, init) => {
    // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
    const headers = new Headers(init?.headers)
    // Generate a client-side request ID so timeouts (which return no server
    // request ID) can still be correlated with server logs by the API team.
    // Callers that want to track the ID themselves can pre-set the header.
    if (injectClientRequestId && !headers.has(CLIENT_REQUEST_ID_HEADER)) {
      headers.set(CLIENT_REQUEST_ID_HEADER, randomUUID())
    }
    try {
      // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
      const url = input instanceof Request ? input.url : String(input)
      const id = headers.get(CLIENT_REQUEST_ID_HEADER)
      logForDebugging(
        `[API REQUEST] ${new URL(url).pathname}${id ? ` ${CLIENT_REQUEST_ID_HEADER}=${id}` : ''} source=${source ?? 'unknown'}`,
      )
    } catch {
      // never let logging crash the fetch
    }
    return inner(input, { ...init, headers })
  }
}
