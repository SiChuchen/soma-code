import type {
  EndpointConfig,
  InferenceSettings,
  ModelEntryConfig,
} from '../settings/types.js'
import { ALL_MODEL_CONFIGS } from '../model/configs.js'
import { importInferenceFromLegacyConfig } from './legacyImport.js'
import type {
  InferenceAuthMode,
  InferenceConfigSource,
  InferenceEndpointKind,
  InferenceProtocol,
  InferenceTransport,
  ResolvedClaudeIdentity,
  ResolvedEndpoint,
  ResolvedInferenceConfig,
  ResolvedInferenceSettings,
  ResolvedModelEntry,
  ResolveInferenceConfigOptions,
} from './types.js'

const BUILTIN_ENDPOINT_ID = 'claude-official'

function trimValue(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function hasInferenceModelInventory(
  inference: InferenceSettings | null | undefined,
): boolean {
  return Boolean(
    (inference?.endpoints?.length ?? 0) > 0 ||
      (inference?.models?.length ?? 0) > 0,
  )
}

function uniqueStrings(values: Array<string | undefined>): string[] {
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

function normalizeMetadata(
  metadata: Record<string, string> | undefined,
): Record<string, string> {
  const normalized: Record<string, string> = {}

  for (const [key, value] of Object.entries(metadata ?? {})) {
    const normalizedKey = trimValue(key)
    const normalizedValue = trimValue(value)
    if (normalizedKey && normalizedValue) {
      normalized[normalizedKey] = normalizedValue
    }
  }

  return normalized
}

function inferEndpointKind(options: {
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

function inferAuthMode(options: {
  kind: InferenceEndpointKind
  protocol: InferenceProtocol
  transport: InferenceTransport
}): InferenceAuthMode {
  const { kind, protocol, transport } = options

  if (transport === 'bedrock') {
    return 'aws'
  }

  if (transport === 'vertex') {
    return 'gcp'
  }

  if (transport === 'foundry') {
    return 'azure_ad'
  }

  if (protocol === 'openai') {
    return 'api_key'
  }

  return kind === 'official_claude' ? 'claude_oauth' : 'api_key'
}

function getFallbackModelIdForEndpoint(endpoint: {
  kind: InferenceEndpointKind
  protocol: InferenceProtocol
  transport: InferenceTransport
}): string {
  const { kind, protocol, transport } = endpoint

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

function normalizeIdentity(
  identity: InferenceSettings['identity'],
): ResolvedClaudeIdentity | null {
  const claude = identity?.claude
  if (!claude) {
    return null
  }

  return {
    enabled: claude.enabled !== false,
    ...(claude.accountMode ? { accountMode: claude.accountMode } : {}),
    ...(trimValue(claude.forceOrgUuid)
      ? { forceOrgUuid: trimValue(claude.forceOrgUuid) }
      : {}),
  }
}

function normalizeEndpoint(
  endpoint: EndpointConfig,
): ResolvedEndpoint | null {
  const id = trimValue(endpoint.id)
  const name = trimValue(endpoint.name)
  if (!id || !name) {
    return null
  }

  const baseUrl = trimValue(endpoint.baseUrl)
  const transport = endpoint.transport ?? 'direct'
  const protocol = endpoint.protocol ?? 'anthropic'
  const kind =
    endpoint.kind ??
    inferEndpointKind({
      baseUrl,
      protocol,
      transport,
    })

  return {
    id,
    name,
    kind,
    transport,
    protocol,
    authMode:
      endpoint.authMode ??
      inferAuthMode({
        kind,
        protocol,
        transport,
      }),
    enabled: endpoint.enabled !== false,
    ...(baseUrl ? { baseUrl } : {}),
    ...(trimValue(endpoint.credentialRef)
      ? { credentialRef: trimValue(endpoint.credentialRef) }
      : {}),
    ...(trimValue(endpoint.defaultModelId)
      ? { defaultModelId: trimValue(endpoint.defaultModelId) }
      : {}),
    metadata: normalizeMetadata(endpoint.metadata),
  }
}

function normalizeModel(
  model: ModelEntryConfig,
): ResolvedModelEntry | null {
  const id = trimValue(model.id)
  const endpointId = trimValue(model.endpointId)
  const remoteModel = trimValue(model.remoteModel)

  if (!id || !endpointId || !remoteModel) {
    return null
  }

  return {
    id,
    label: trimValue(model.label) ?? id,
    endpointId,
    remoteModel,
    aliases: uniqueStrings(model.aliases ?? []),
    enabled: model.enabled !== false,
    isDefaultCandidate: model.isDefaultCandidate === true,
    ...(trimValue(model.capabilityProfile)
      ? { capabilityProfile: trimValue(model.capabilityProfile) }
      : {}),
    ...(trimValue(model.billingProfile)
      ? { billingProfile: trimValue(model.billingProfile) }
      : {}),
  }
}

function createSyntheticModel(
  endpoint: ResolvedEndpoint,
  modelId: string,
  isDefaultCandidate: boolean,
): ResolvedModelEntry {
  return {
    id: modelId,
    label: modelId,
    endpointId: endpoint.id,
    remoteModel: modelId,
    aliases: [],
    enabled: true,
    isDefaultCandidate,
  }
}

function dedupeEndpoints(endpoints: ResolvedEndpoint[]): ResolvedEndpoint[] {
  const out: ResolvedEndpoint[] = []
  const seen = new Set<string>()

  for (const endpoint of endpoints) {
    if (seen.has(endpoint.id)) {
      continue
    }
    seen.add(endpoint.id)
    out.push(endpoint)
  }

  return out
}

function dedupeModels(models: ResolvedModelEntry[]): ResolvedModelEntry[] {
  const out: ResolvedModelEntry[] = []
  const seen = new Set<string>()

  for (const model of models) {
    if (seen.has(model.id)) {
      continue
    }
    seen.add(model.id)
    out.push(model)
  }

  return out
}

function findModelByIdentifier(
  models: ResolvedModelEntry[],
  identifier: string | undefined,
): ResolvedModelEntry | undefined {
  if (!identifier) {
    return undefined
  }

  return models.find(
    model =>
      model.id === identifier ||
      model.remoteModel === identifier ||
      model.aliases.includes(identifier),
  )
}

function createBuiltInEndpoint(): ResolvedEndpoint {
  return {
    id: BUILTIN_ENDPOINT_ID,
    name: 'Official account',
    kind: 'official_claude',
    transport: 'direct',
    protocol: 'anthropic',
    authMode: 'claude_oauth',
    enabled: true,
    baseUrl: 'https://api.anthropic.com',
    defaultModelId: ALL_MODEL_CONFIGS.sonnet46.firstParty,
    metadata: {},
  }
}

function getBaseInferenceConfig(
  options: ResolveInferenceConfigOptions,
): {
  config: InferenceSettings
  source: InferenceConfigSource
} {
  if (options.inference !== undefined && options.inference !== null) {
    return {
      config: options.inference,
      source: 'inference',
    }
  }

  const legacyConfig = importInferenceFromLegacyConfig({
    legacyEnv: options.legacyEnv,
    settingsApi: options.settingsApi,
    settingsModel: options.settingsModel,
  })

  if (legacyConfig) {
    if (options.settingsApi) {
      return {
        config: legacyConfig,
        source: 'settingsApi',
      }
    }

    if (trimValue(options.settingsModel)) {
      return {
        config: legacyConfig,
        source: 'settingsModel',
      }
    }

    return {
      config: legacyConfig,
      source: 'legacyEnv',
    }
  }

  return {
    config: {
      version: 1,
    },
    source: 'default',
  }
}

export function resolveInferenceConfig(
  options: ResolveInferenceConfigOptions,
): ResolvedInferenceConfig {
  const { config: baseConfig, source } = getBaseInferenceConfig(options)

  let endpoints = dedupeEndpoints(
    (baseConfig.endpoints ?? [])
      .map(normalizeEndpoint)
      .filter((endpoint): endpoint is ResolvedEndpoint => endpoint !== null)
      .filter(endpoint => endpoint.enabled),
  )

  if (endpoints.length === 0) {
    endpoints = [createBuiltInEndpoint()]
  }

  const endpointIds = new Set(endpoints.map(endpoint => endpoint.id))

  let models = dedupeModels(
    (baseConfig.models ?? [])
      .map(normalizeModel)
      .filter((model): model is ResolvedModelEntry => model !== null)
      .filter(model => model.enabled && endpointIds.has(model.endpointId)),
  )

  const existingModelIds = new Set(models.map(model => model.id))
  const synthesizedModels: ResolvedModelEntry[] = []

  for (const endpoint of endpoints) {
    const endpointDefaultModelId = trimValue(endpoint.defaultModelId)
    if (!endpointDefaultModelId || existingModelIds.has(endpointDefaultModelId)) {
      continue
    }

    existingModelIds.add(endpointDefaultModelId)
    synthesizedModels.push(
      createSyntheticModel(
        endpoint,
        endpointDefaultModelId,
        trimValue(baseConfig.defaults?.modelId) === endpointDefaultModelId,
      ),
    )
  }

  models = [...models, ...synthesizedModels]

  if (models.length === 0) {
    const fallbackEndpoint = endpoints[0]
    const fallbackModelId =
      trimValue(fallbackEndpoint.defaultModelId) ??
      getFallbackModelIdForEndpoint(fallbackEndpoint)

    models = [
      createSyntheticModel(fallbackEndpoint, fallbackModelId, true),
    ]
  }

  const modelsByEndpoint = new Map<string, ResolvedModelEntry[]>()
  for (const model of models) {
    const bucket = modelsByEndpoint.get(model.endpointId) ?? []
    bucket.push(model)
    modelsByEndpoint.set(model.endpointId, bucket)
  }

  endpoints = endpoints.map(endpoint => {
    const endpointModels = modelsByEndpoint.get(endpoint.id) ?? []
    const resolvedDefaultModel =
      findModelByIdentifier(endpointModels, trimValue(endpoint.defaultModelId)) ??
      endpointModels.find(model => model.isDefaultCandidate) ??
      endpointModels[0]

    return resolvedDefaultModel
      ? {
          ...endpoint,
          defaultModelId: resolvedDefaultModel.id,
        }
      : endpoint
  })

  const explicitDefaultModel =
    findModelByIdentifier(models, trimValue(baseConfig.defaults?.modelId)) ??
    undefined
  const inferredDefaultModel =
    explicitDefaultModel ??
    models.find(model => model.isDefaultCandidate) ??
    findModelByIdentifier(models, endpoints[0]?.defaultModelId) ??
    models[0]
  const selectedModel =
    findModelByIdentifier(models, trimValue(options.selectedModelId)) ??
    inferredDefaultModel
  const selectedEndpoint =
    endpoints.find(endpoint => endpoint.id === selectedModel.endpointId) ??
    endpoints[0]
  const identity =
    normalizeIdentity(baseConfig.identity) ??
    (endpoints.some(
      endpoint =>
        endpoint.kind === 'official_claude' &&
        endpoint.authMode === 'claude_oauth',
    )
      ? { enabled: true }
      : null)
  const resolvedConfig: ResolvedInferenceSettings = {
    version: 1,
    ...(identity
      ? {
          identity: {
            claude: identity,
          },
        }
      : {}),
    endpoints,
    models,
    defaults: {
      modelId: inferredDefaultModel.id,
    },
  }

  return {
    source,
    config: resolvedConfig,
    identity,
    endpoints,
    models,
    defaultModelId: inferredDefaultModel.id,
    selectedModelId: selectedModel.id,
    selectedModel,
    selectedEndpoint,
  }
}
