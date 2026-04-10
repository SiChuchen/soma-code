import { getMainLoopModelOverride } from '../../bootstrap/state.js'
import { syncRefreshChatGPTToken } from '../../services/chatgpt-oauth/index.js'
import {
  getOpenAICompatProfileDefaults,
  parseOpenAICompatApiFormat,
  type OpenAICompatApiFormat,
} from '../openaiCompatConfig.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import type { SettingsJson } from '../settings/types.js'
import { isEnvTruthy } from '../envUtils.js'
import { getSecureStorage } from '../secureStorage/index.js'
import {
  getEndpointCredential,
} from './credentials.js'
import {
  resolveSelectedModelRoute,
  type ResolvedInferenceModelRoute,
} from './router.js'
import type { ResolvedEndpoint, ResolvedModelEntry } from './types.js'

export type InferenceClientProvider =
  | 'firstParty'
  | 'anthropicCompatible'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openaiCompatible'

export type OpenAICompatRuntimeConfig = {
  apiFormat?: OpenAICompatApiFormat
  apiKey?: string
  apiKeyHeaderName?: string
  apiKeyScheme?: string
  baseUrl?: string
  customHeaders?: Record<string, string>
  disableAuth?: boolean
  model?: string
  profile?: string
}

export type AnthropicCompatibleRuntimeConfig = {
  apiKey?: string
  baseUrl?: string
  model?: string
}

type DirectTransportConfig = {
  kind: 'direct'
  baseUrl?: string
  isFirstPartyAnthropicBaseUrl: boolean
}

type BedrockTransportConfig = {
  kind: 'bedrock'
  awsRegion?: string
  baseUrl?: string
  skipAuth: boolean
}

type VertexTransportConfig = {
  kind: 'vertex'
  baseUrl?: string
  projectId?: string
  region?: string
  skipAuth: boolean
}

type FoundryTransportConfig = {
  kind: 'foundry'
  baseUrl?: string
  resource?: string
  skipAuth: boolean
}

export type InferenceClientDescriptor = {
  anthropicCompatible?: AnthropicCompatibleRuntimeConfig
  endpoint: ResolvedEndpoint
  endpointApiKey?: string
  model: ResolvedModelEntry
  openAICompat?: OpenAICompatRuntimeConfig
  provider: InferenceClientProvider
  route: ResolvedInferenceModelRoute
  transportConfig:
    | BedrockTransportConfig
    | DirectTransportConfig
    | FoundryTransportConfig
    | VertexTransportConfig
}

function trimValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function hasOwnString(
  metadata: Record<string, string>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(metadata, key)
}

function parseOptionalBoolean(
  metadata: Record<string, string>,
  key: string,
): boolean | undefined {
  if (!hasOwnString(metadata, key)) {
    return undefined
  }

  const value = trimValue(metadata[key])
  if (value === undefined) {
    return undefined
  }

  return isEnvTruthy(value)
}

function isFirstPartyAnthropicBaseUrl(baseUrl: string | undefined): boolean {
  if (!baseUrl) {
    return true
  }

  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}

function getProviderForEndpoint(
  endpoint: ResolvedEndpoint,
): InferenceClientProvider {
  if (endpoint.transport === 'bedrock') {
    return 'bedrock'
  }

  if (endpoint.transport === 'vertex') {
    return 'vertex'
  }

  if (endpoint.transport === 'foundry') {
    return 'foundry'
  }

  if (endpoint.protocol === 'openai') {
    return 'openaiCompatible'
  }

  return isFirstPartyAnthropicBaseUrl(endpoint.baseUrl)
    ? 'firstParty'
    : 'anthropicCompatible'
}

function getAnthropicCompatibleRuntimeConfig(
  endpoint: ResolvedEndpoint,
  model: ResolvedModelEntry,
  endpointApiKey: string | undefined,
): AnthropicCompatibleRuntimeConfig {
  return {
    apiKey: endpointApiKey,
    baseUrl: endpoint.baseUrl,
    model: model.remoteModel,
  }
}

function getOpenAICompatRuntimeConfig(
  endpoint: ResolvedEndpoint,
  model: ResolvedModelEntry,
  endpointApiKey: string | undefined,
): OpenAICompatRuntimeConfig {
  const metadata = endpoint.metadata
  const profile = trimValue(metadata.openaiProfile)
  const defaults = getOpenAICompatProfileDefaults(profile)
  const apiKeyScheme = hasOwnString(metadata, 'apiKeyScheme')
    ? (metadata.apiKeyScheme ?? '').trim()
    : defaults.apiKeyScheme
  const disableAuth = parseOptionalBoolean(metadata, 'disableAuth')

  // ChatGPT OAuth: inject full set of required headers
  let customHeaders: Record<string, string> | undefined
  if (endpoint.authMode === 'chatgpt_oauth') {
    const chatgptData = getSecureStorage().read()?.chatgptOauth
    if (chatgptData?.accessToken) {
      customHeaders = {
        authorization: `Bearer ${chatgptData.accessToken}`,
        ...(chatgptData.accountId
          ? { 'chatgpt-account-id': chatgptData.accountId }
          : {}),
        'OpenAI-Beta': 'responses=experimental',
        originator: 'codex_cli_rs',
      }
      // Trigger background refresh if token is near expiry. The current
      // request uses whatever is on disk; the refreshed token will be
      // available for subsequent requests.
      void syncRefreshChatGPTToken()
    }
  }

  return {
    apiFormat: parseOpenAICompatApiFormat(metadata.apiFormat),
    apiKey: endpointApiKey,
    apiKeyHeaderName:
      trimValue(metadata.apiKeyHeader) ?? defaults.apiKeyHeaderName,
    apiKeyScheme,
    baseUrl: endpoint.baseUrl ?? defaults.baseUrl,
    customHeaders,
    disableAuth: disableAuth ?? defaults.disableAuth,
    model: model.remoteModel,
    profile,
  }
}

function getTransportConfig(
  endpoint: ResolvedEndpoint,
): InferenceClientDescriptor['transportConfig'] {
  const metadata = endpoint.metadata

  if (endpoint.transport === 'bedrock') {
    return {
      kind: 'bedrock',
      awsRegion: trimValue(metadata.awsRegion),
      baseUrl: endpoint.baseUrl,
      skipAuth:
        parseOptionalBoolean(metadata, 'skipAuth') ??
        isEnvTruthy(process.env.CLAUDE_CODE_SKIP_BEDROCK_AUTH),
    }
  }

  if (endpoint.transport === 'vertex') {
    return {
      kind: 'vertex',
      baseUrl: endpoint.baseUrl,
      projectId: trimValue(metadata.projectId),
      region: trimValue(metadata.region),
      skipAuth:
        parseOptionalBoolean(metadata, 'skipAuth') ??
        isEnvTruthy(process.env.CLAUDE_CODE_SKIP_VERTEX_AUTH),
    }
  }

  if (endpoint.transport === 'foundry') {
    return {
      kind: 'foundry',
      baseUrl: endpoint.baseUrl,
      resource: trimValue(metadata.resource),
      skipAuth:
        parseOptionalBoolean(metadata, 'skipAuth') ??
        isEnvTruthy(process.env.CLAUDE_CODE_SKIP_FOUNDRY_AUTH),
    }
  }

  return {
    kind: 'direct',
    baseUrl: endpoint.baseUrl,
    isFirstPartyAnthropicBaseUrl:
      endpoint.protocol === 'anthropic' &&
      isFirstPartyAnthropicBaseUrl(endpoint.baseUrl),
  }
}

export function resolveInferenceClientDescriptor(options: {
  legacyEnv?: Record<string, string | undefined>
  model?: string
  sessionModel?: string
  settings?: SettingsJson | null
} = {}): InferenceClientDescriptor {
  const settings = options.settings ?? getSettings_DEPRECATED() ?? {}
  const sessionModel =
    options.sessionModel ?? getMainLoopModelOverride() ?? undefined
  const route = resolveSelectedModelRoute({
    explicitModel: options.model,
    legacyEnv: options.legacyEnv,
    sessionModel,
    settings,
  })
  const endpoint = route.selectedEndpoint
  const model = route.selectedModel

  if (!endpoint || !model) {
    throw new Error('No inference endpoint/model configured')
  }

  const provider = getProviderForEndpoint(endpoint)
  const endpointCredential = getEndpointCredential(endpoint.id)
  const endpointApiKey =
    endpointCredential?.type === 'api_key'
      ? trimValue(endpointCredential.apiKey)
      : undefined

  return {
    ...(provider === 'anthropicCompatible'
      ? {
          anthropicCompatible: getAnthropicCompatibleRuntimeConfig(
            endpoint,
            model,
            endpointApiKey,
          ),
        }
      : {}),
    endpoint,
    ...(endpointApiKey ? { endpointApiKey } : {}),
    model,
    ...(provider === 'openaiCompatible'
      ? {
          openAICompat: getOpenAICompatRuntimeConfig(
            endpoint,
            model,
            endpointApiKey,
          ),
        }
      : {}),
    provider,
    route,
    transportConfig: getTransportConfig(endpoint),
  }
}
