import { API_VENDOR_LABELS } from '../settings/apiConfigMetadata.js'
import {
  deriveApiSettingsFromLegacyEnv,
  materializeApiConfigEnv,
  normalizeApiSettings,
} from '../settings/apiConfig.js'
import type {
  ApiSettings,
  EndpointConfig,
  InferenceSettings,
  ModelEntryConfig,
} from '../settings/types.js'
import { ALL_MODEL_CONFIGS } from '../model/configs.js'
import { isEnvTruthy } from '../envUtils.js'
import type {
  InferenceAuthMode,
  InferenceEndpointKind,
  InferenceProtocol,
  InferenceTransport,
  ResolveInferenceConfigOptions,
} from './types.js'

export const LEGACY_INFERENCE_ENDPOINT_ID = 'legacy-default'

function trimValue(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function uniqueValues(values: Array<string | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue
    }
    seen.add(value)
    out.push(value)
  }

  return out
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

function getLegacyTransport(
  env: Record<string, string | undefined>,
): InferenceTransport {
  if (isEnvTruthy(env.CLAUDE_CODE_USE_BEDROCK)) {
    return 'bedrock'
  }

  if (isEnvTruthy(env.CLAUDE_CODE_USE_VERTEX)) {
    return 'vertex'
  }

  if (isEnvTruthy(env.CLAUDE_CODE_USE_FOUNDRY)) {
    return 'foundry'
  }

  return 'direct'
}

function getLegacyProtocol(
  transport: InferenceTransport,
  api: ApiSettings | undefined,
): InferenceProtocol {
  return transport === 'direct' ? (api?.compatibility ?? 'anthropic') : 'anthropic'
}

function getLegacyKind(options: {
  baseUrl: string | undefined
  protocol: InferenceProtocol
  transport: InferenceTransport
}): InferenceEndpointKind {
  const { baseUrl, protocol, transport } = options

  return transport === 'direct' &&
    protocol === 'anthropic' &&
    isFirstPartyAnthropicBaseUrl(baseUrl)
    ? 'official_claude'
    : 'custom'
}

function getLegacyBaseUrl(options: {
  effectiveEnv: Record<string, string>
  legacyEnv: Record<string, string | undefined>
  protocol: InferenceProtocol
  transport: InferenceTransport
}): string | undefined {
  const { effectiveEnv, legacyEnv, protocol, transport } = options

  if (transport === 'bedrock') {
    return (
      trimValue(legacyEnv.ANTHROPIC_BEDROCK_BASE_URL) ??
      trimValue(legacyEnv.BEDROCK_BASE_URL)
    )
  }

  if (transport === 'vertex') {
    return (
      trimValue(legacyEnv.ANTHROPIC_VERTEX_BASE_URL) ??
      trimValue(legacyEnv.VERTEX_BASE_URL)
    )
  }

  if (transport === 'foundry') {
    return trimValue(legacyEnv.ANTHROPIC_FOUNDRY_BASE_URL)
  }

  return protocol === 'openai'
    ? trimValue(effectiveEnv.OPENAI_BASE_URL)
    : trimValue(effectiveEnv.ANTHROPIC_BASE_URL)
}

function getLegacyAuthMode(options: {
  api: ApiSettings | undefined
  kind: InferenceEndpointKind
  legacyEnv: Record<string, string | undefined>
  protocol: InferenceProtocol
  transport: InferenceTransport
}): InferenceAuthMode {
  const { api, kind, legacyEnv, protocol, transport } = options

  if (transport === 'bedrock') {
    return 'aws'
  }

  if (transport === 'vertex') {
    return 'gcp'
  }

  if (transport === 'foundry') {
    return trimValue(legacyEnv.ANTHROPIC_FOUNDRY_API_KEY)
      ? 'azure_api_key'
      : 'azure_ad'
  }

  if (protocol === 'openai') {
    return 'api_key'
  }

  if (kind === 'official_claude') {
    return api?.apiKey ||
      trimValue(legacyEnv.ANTHROPIC_API_KEY) ||
      trimValue(legacyEnv.ANTHROPIC_AUTH_TOKEN)
      ? 'api_key'
      : 'claude_oauth'
  }

  return 'api_key'
}

function getLegacyEndpointName(options: {
  api: ApiSettings | undefined
  kind: InferenceEndpointKind
  protocol: InferenceProtocol
  transport: InferenceTransport
}): string {
  const { api, kind, protocol, transport } = options

  if (transport === 'bedrock') {
    return 'AWS Bedrock'
  }

  if (transport === 'vertex') {
    return 'Google Vertex AI'
  }

  if (transport === 'foundry') {
    return 'Microsoft Foundry'
  }

  if (kind === 'official_claude') {
    return 'Official account'
  }

  if (api?.customName) {
    return api.customName
  }

  if (api?.mode === 'preset' && api.preset && api.preset !== 'custom') {
    return API_VENDOR_LABELS[api.preset]
  }

  return protocol === 'openai' ? 'OpenAI-compatible' : 'Anthropic-compatible'
}

function getLegacyFallbackModelId(options: {
  kind: InferenceEndpointKind
  protocol: InferenceProtocol
  transport: InferenceTransport
}): string {
  const { kind, protocol, transport } = options

  if (transport === 'bedrock') {
    return ALL_MODEL_CONFIGS.sonnet45.bedrock
  }

  if (transport === 'vertex') {
    return ALL_MODEL_CONFIGS.sonnet45.vertex
  }

  if (transport === 'foundry') {
    return ALL_MODEL_CONFIGS.sonnet45.foundry
  }

  if (protocol === 'openai') {
    return ALL_MODEL_CONFIGS.sonnet45.openaiCompatible
  }

  return kind === 'official_claude'
    ? ALL_MODEL_CONFIGS.sonnet46.firstParty
    : ALL_MODEL_CONFIGS.sonnet46.firstParty
}

function getLegacyMetadata(options: {
  effectiveEnv: Record<string, string>
  legacyEnv: Record<string, string | undefined>
  protocol: InferenceProtocol
  transport: InferenceTransport
}): Record<string, string> | undefined {
  const { effectiveEnv, legacyEnv, protocol, transport } = options
  const metadata: Record<string, string> = {}

  if (transport === 'bedrock') {
    metadata.awsRegion =
      trimValue(legacyEnv.AWS_REGION) ??
      trimValue(legacyEnv.AWS_DEFAULT_REGION) ??
      'us-east-1'

    if (isEnvTruthy(legacyEnv.CLAUDE_CODE_SKIP_BEDROCK_AUTH)) {
      metadata.skipAuth = 'true'
    }
  }

  if (transport === 'vertex') {
    const projectId = trimValue(legacyEnv.ANTHROPIC_VERTEX_PROJECT_ID)
    if (projectId) {
      metadata.projectId = projectId
    }

    metadata.region = trimValue(legacyEnv.CLOUD_ML_REGION) ?? 'us-east5'

    if (isEnvTruthy(legacyEnv.CLAUDE_CODE_SKIP_VERTEX_AUTH)) {
      metadata.skipAuth = 'true'
    }
  }

  if (transport === 'foundry') {
    const resource = trimValue(legacyEnv.ANTHROPIC_FOUNDRY_RESOURCE)
    if (resource) {
      metadata.resource = resource
    }

    if (isEnvTruthy(legacyEnv.CLAUDE_CODE_SKIP_FOUNDRY_AUTH)) {
      metadata.skipAuth = 'true'
    }
  }

  if (transport === 'direct' && protocol === 'openai') {
    const openAIProfile = trimValue(effectiveEnv.OPENAI_COMPAT_PROFILE)
    if (openAIProfile) {
      metadata.openaiProfile = openAIProfile
    }

    const apiKeyHeader = trimValue(effectiveEnv.OPENAI_API_KEY_HEADER)
    if (apiKeyHeader) {
      metadata.apiKeyHeader = apiKeyHeader
    }

    if (Object.prototype.hasOwnProperty.call(effectiveEnv, 'OPENAI_API_KEY_SCHEME')) {
      metadata.apiKeyScheme = effectiveEnv.OPENAI_API_KEY_SCHEME?.trim() ?? ''
    }

    const apiFormat = trimValue(effectiveEnv.OPENAI_COMPAT_API_FORMAT)
    if (apiFormat) {
      metadata.apiFormat = apiFormat
    }

    if (Object.prototype.hasOwnProperty.call(effectiveEnv, 'OPENAI_COMPAT_DISABLE_AUTH')) {
      metadata.disableAuth = String(
        isEnvTruthy(effectiveEnv.OPENAI_COMPAT_DISABLE_AUTH),
      )
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

function createLegacyModelEntry(
  modelId: string,
  endpointId: string,
  isDefaultCandidate: boolean,
): ModelEntryConfig {
  return {
    id: modelId,
    label: modelId,
    endpointId,
    remoteModel: modelId,
    enabled: true,
    ...(isDefaultCandidate ? { isDefaultCandidate: true } : {}),
  }
}

export function importInferenceFromLegacyConfig(
  options: Pick<
    ResolveInferenceConfigOptions,
    'legacyEnv' | 'settingsApi' | 'settingsModel'
  >,
): InferenceSettings | undefined {
  const legacyEnv = options.legacyEnv ?? {}
  const normalizedSettingsApi = normalizeApiSettings(options.settingsApi)
  const normalizedLegacyApi = deriveApiSettingsFromLegacyEnv(legacyEnv)
  const transport = getLegacyTransport(legacyEnv)
  const settingsModel = trimValue(options.settingsModel)
  const api = normalizedSettingsApi ?? normalizedLegacyApi

  if (
    !api &&
    transport === 'direct' &&
    settingsModel === undefined
  ) {
    return undefined
  }

  const protocol = getLegacyProtocol(transport, api)
  const effectiveEnv = api ? materializeApiConfigEnv(api) : {}
  const rawBaseUrl = getLegacyBaseUrl({
    effectiveEnv,
    legacyEnv,
    protocol,
    transport,
  })
  const kind = getLegacyKind({
    baseUrl: rawBaseUrl,
    protocol,
    transport,
  })
  const baseUrl =
    rawBaseUrl ??
    (kind === 'official_claude' ? 'https://api.anthropic.com' : undefined)
  const endpointDefaultModelId =
    trimValue(
      protocol === 'openai' ? effectiveEnv.OPENAI_MODEL : effectiveEnv.ANTHROPIC_MODEL,
    ) ??
    settingsModel ??
    getLegacyFallbackModelId({
      kind,
      protocol,
      transport,
    })
  const defaultModelId = settingsModel ?? endpointDefaultModelId
  const modelIds = uniqueValues([endpointDefaultModelId, defaultModelId])
  const models = modelIds.map(modelId =>
    createLegacyModelEntry(
      modelId,
      LEGACY_INFERENCE_ENDPOINT_ID,
      modelId === defaultModelId,
    ),
  )
  const metadata = getLegacyMetadata({
    effectiveEnv,
    legacyEnv,
    protocol,
    transport,
  })

  const endpoint: EndpointConfig = {
    id: LEGACY_INFERENCE_ENDPOINT_ID,
    name: getLegacyEndpointName({
      api,
      kind,
      protocol,
      transport,
    }),
    kind,
    transport,
    protocol,
    authMode: getLegacyAuthMode({
      api,
      kind,
      legacyEnv,
      protocol,
      transport,
    }),
    enabled: true,
    ...(baseUrl ? { baseUrl } : {}),
    ...(endpointDefaultModelId ? { defaultModelId: endpointDefaultModelId } : {}),
    ...(metadata ? { metadata } : {}),
  }

  return {
    version: 1,
    ...(endpoint.authMode === 'claude_oauth'
      ? {
          identity: {
            claude: {
              enabled: true,
            },
          },
        }
      : {}),
    endpoints: [endpoint],
    models,
    defaults: {
      modelId: defaultModelId,
    },
  }
}
