import { ALL_MODEL_CONFIGS } from '../model/configs.js'
import type {
  EndpointConfig,
  InferenceSettings,
  ModelEntryConfig,
  SettingsJson,
} from '../settings/types.js'
import { stripApiConfigEnv } from '../settings/apiConfig.js'
import { resolveInferenceConfig } from './resolve.js'
import type { ResolveInferenceConfigOptions, ResolvedEndpoint } from './types.js'

export const INFERENCE_CONNECTION_TYPES = [
  'official',
  'anthropic',
  'openai',
  'bedrock',
  'vertex',
  'foundry',
  'chatgpt',
] as const

export type InferenceConnectionType =
  (typeof INFERENCE_CONNECTION_TYPES)[number]

export const INFERENCE_CONNECTION_TYPE_LABELS: Record<
  InferenceConnectionType,
  string
> = {
  official: 'Official account',
  anthropic: 'Anthropic-compatible',
  openai: 'OpenAI-compatible',
  bedrock: 'AWS Bedrock',
  vertex: 'Google Vertex AI',
  foundry: 'Microsoft Foundry',
  chatgpt: 'ChatGPT',
}

type InferenceConnectionUpdate = {
  authMode?: EndpointConfig['authMode']
  baseUrl?: string
  endpointId: string
  metadata?: Record<string, string | undefined>
  name?: string
  remoteModel?: string
  type?: InferenceConnectionType
}

function trimValue(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function cloneEndpoint(endpoint: EndpointConfig): EndpointConfig {
  return {
    ...endpoint,
    ...(endpoint.metadata ? { metadata: { ...endpoint.metadata } } : {}),
  }
}

function cloneModel(model: ModelEntryConfig): ModelEntryConfig {
  return {
    ...model,
    ...(model.aliases ? { aliases: [...model.aliases] } : {}),
  }
}

export function cloneInferenceSettings(
  inference: InferenceSettings | null | undefined,
): InferenceSettings {
  if (!inference) {
    return {
      version: 1,
    }
  }

  return {
    version: 1,
    ...(inference.identity
      ? {
          identity: {
            ...(inference.identity.claude
              ? {
                  claude: {
                    ...inference.identity.claude,
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(inference.endpoints
      ? {
          endpoints: inference.endpoints.map(cloneEndpoint),
        }
      : {}),
    ...(inference.models
      ? {
          models: inference.models.map(cloneModel),
        }
      : {}),
    ...(inference.defaults
      ? {
          defaults: {
            ...inference.defaults,
          },
        }
      : {}),
  }
}

export function buildEditableInferenceSettings(
  options: ResolveInferenceConfigOptions,
): InferenceSettings {
  return cloneInferenceSettings(resolveInferenceConfig(options).config)
}

export function buildInferenceSettingsWritePatch(
  inference: InferenceSettings | null | undefined,
  existingEnv: Record<string, string | undefined> | undefined,
): Pick<SettingsJson, 'api' | 'env' | 'inference' | 'model'> {
  const nextInference = inference ? cloneInferenceSettings(inference) : undefined
  const strippedEnv = stripApiConfigEnv(existingEnv)
  const removedKeys = Object.keys(existingEnv ?? {}).filter(
    key => !(key in strippedEnv),
  )

  if (removedKeys.length === 0) {
    return {
      inference: nextInference,
      model: undefined,
      api: undefined,
    }
  }

  if (Object.keys(strippedEnv).length === 0) {
    return {
      inference: nextInference,
      model: undefined,
      api: undefined,
      env: undefined,
    }
  }

  const envPatch: Record<string, string | undefined> = { ...strippedEnv }
  for (const key of removedKeys) {
    envPatch[key] = undefined
  }

  return {
    inference: nextInference,
    model: undefined,
    api: undefined,
    env: envPatch as Record<string, string>,
  }
}

export function getInferenceConnectionType(
  endpoint: Pick<ResolvedEndpoint, 'authMode' | 'kind' | 'protocol' | 'transport'>,
): InferenceConnectionType {
  if (endpoint.kind === 'official_claude') {
    return 'official'
  }

  if (endpoint.transport === 'bedrock') {
    return 'bedrock'
  }

  if (endpoint.transport === 'vertex') {
    return 'vertex'
  }

  if (endpoint.transport === 'foundry') {
    return 'foundry'
  }

  // ChatGPT connections use openaiProfile metadata to distinguish
  if (
    endpoint.protocol === 'openai' &&
    endpoint.kind === 'custom' &&
    endpoint.authMode === 'chatgpt_oauth'
  ) {
    return 'chatgpt'
  }

  return endpoint.protocol === 'openai' ? 'openai' : 'anthropic'
}

function getConnectionTemplate(
  type: InferenceConnectionType,
  endpointId: string,
): EndpointConfig {
  switch (type) {
    case 'official':
      return {
        id: endpointId,
        name: INFERENCE_CONNECTION_TYPE_LABELS.official,
        kind: 'official_claude',
        transport: 'direct',
        protocol: 'anthropic',
        authMode: 'claude_oauth',
        enabled: true,
        baseUrl: 'https://api.anthropic.com',
      }
    case 'openai':
      return {
        id: endpointId,
        name: INFERENCE_CONNECTION_TYPE_LABELS.openai,
        kind: 'custom',
        transport: 'direct',
        protocol: 'openai',
        authMode: 'api_key',
        enabled: true,
      }
    case 'bedrock':
      return {
        id: endpointId,
        name: INFERENCE_CONNECTION_TYPE_LABELS.bedrock,
        kind: 'custom',
        transport: 'bedrock',
        protocol: 'anthropic',
        authMode: 'aws',
        enabled: true,
      }
    case 'vertex':
      return {
        id: endpointId,
        name: INFERENCE_CONNECTION_TYPE_LABELS.vertex,
        kind: 'custom',
        transport: 'vertex',
        protocol: 'anthropic',
        authMode: 'gcp',
        enabled: true,
      }
    case 'foundry':
      return {
        id: endpointId,
        name: INFERENCE_CONNECTION_TYPE_LABELS.foundry,
        kind: 'custom',
        transport: 'foundry',
        protocol: 'anthropic',
        authMode: 'azure_ad',
        enabled: true,
      }
    case 'chatgpt':
      return {
        id: endpointId,
        name: INFERENCE_CONNECTION_TYPE_LABELS.chatgpt,
        kind: 'custom',
        transport: 'direct',
        protocol: 'openai',
        authMode: 'chatgpt_oauth',
        enabled: true,
        baseUrl: 'https://chatgpt.com/backend-api/codex/responses',
        metadata: {
          openaiProfile: 'chatgpt',
          apiFormat: 'responses',
        },
      }
    case 'anthropic':
    default:
      return {
        id: endpointId,
        name: INFERENCE_CONNECTION_TYPE_LABELS.anthropic,
        kind: 'custom',
        transport: 'direct',
        protocol: 'anthropic',
        authMode: 'api_key',
        enabled: true,
      }
  }
}

export function getDefaultRemoteModelForConnectionType(
  type: InferenceConnectionType,
): string {
  switch (type) {
    case 'openai':
      return ALL_MODEL_CONFIGS.sonnet45.openaiCompatible
    case 'bedrock':
      return ALL_MODEL_CONFIGS.sonnet45.bedrock
    case 'vertex':
      return ALL_MODEL_CONFIGS.sonnet45.vertex
    case 'foundry':
      return ALL_MODEL_CONFIGS.sonnet45.foundry
    case 'chatgpt':
      return 'gpt-5.4'
    case 'official':
    case 'anthropic':
    default:
      return ALL_MODEL_CONFIGS.sonnet46.firstParty
  }
}

function getEndpointIdBase(type: InferenceConnectionType): string {
  switch (type) {
    case 'official':
      return 'claude-official'
    case 'anthropic':
      return 'anthropic'
    case 'openai':
      return 'openai'
    case 'bedrock':
      return 'bedrock'
    case 'vertex':
      return 'vertex'
    case 'foundry':
      return 'foundry'
    case 'chatgpt':
      return 'chatgpt'
  }
}

function getUniqueEndpointId(
  inference: InferenceSettings,
  type: InferenceConnectionType,
): string {
  const existingIds = new Set((inference.endpoints ?? []).map(endpoint => endpoint.id))
  const baseId = getEndpointIdBase(type)

  if (!existingIds.has(baseId)) {
    return baseId
  }

  let suffix = 2
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1
  }

  return `${baseId}-${suffix}`
}

function getModelIdBase(endpointId: string, remoteModel: string): string {
  return `${endpointId}::${remoteModel}`
}

function getUniqueModelId(
  inference: InferenceSettings,
  endpointId: string,
  remoteModel: string,
): string {
  const existingIds = new Set((inference.models ?? []).map(model => model.id))
  const baseId = getModelIdBase(endpointId, remoteModel)

  if (!existingIds.has(baseId)) {
    return baseId
  }

  let suffix = 2
  while (existingIds.has(`${baseId}#${suffix}`)) {
    suffix += 1
  }

  return `${baseId}#${suffix}`
}

function findEndpoint(
  inference: InferenceSettings,
  endpointId: string,
): EndpointConfig | undefined {
  return inference.endpoints?.find(endpoint => endpoint.id === endpointId)
}

function findEndpointModels(
  inference: InferenceSettings,
  endpointId: string,
): ModelEntryConfig[] {
  return (inference.models ?? []).filter(model => model.endpointId === endpointId)
}

export function getEndpointDefaultModel(
  inference: InferenceSettings,
  endpointId: string,
): ModelEntryConfig | undefined {
  const endpoint = findEndpoint(inference, endpointId)
  const endpointModels = findEndpointModels(inference, endpointId)
  const defaultModelId = trimValue(endpoint?.defaultModelId)

  return (
    endpointModels.find(
      model =>
        model.id === defaultModelId || model.remoteModel === defaultModelId,
    ) ?? endpointModels[0]
  )
}

function shouldRemoveAutoManagedModel(model: ModelEntryConfig): boolean {
  return (
    trimValue(model.id)?.includes('::') === true &&
    (trimValue(model.label) ?? '') === (trimValue(model.remoteModel) ?? '')
  )
}

export function addInferenceConnection(
  inference: InferenceSettings | null | undefined,
  type: InferenceConnectionType,
): {
  endpointId: string
  inference: InferenceSettings
} {
  const next = cloneInferenceSettings(inference)
  const endpointId = getUniqueEndpointId(next, type)
  const template = getConnectionTemplate(type, endpointId)
  const remoteModel = getDefaultRemoteModelForConnectionType(type)
  const modelId = getUniqueModelId(next, endpointId, remoteModel)

  next.endpoints = [...(next.endpoints ?? []), {
    ...template,
    defaultModelId: modelId,
  }]
  next.models = [
    ...(next.models ?? []),
    {
      id: modelId,
      label: remoteModel,
      endpointId,
      remoteModel,
      enabled: true,
      isDefaultCandidate: true,
    },
  ]

  return {
    endpointId,
    inference: next,
  }
}

export function updateInferenceConnection(
  inference: InferenceSettings | null | undefined,
  update: InferenceConnectionUpdate,
): InferenceSettings {
  const next = cloneInferenceSettings(inference)
  const existingEndpoint = findEndpoint(next, update.endpointId)
  const nextType =
    update.type ??
    (existingEndpoint
      ? getInferenceConnectionType({
          authMode: existingEndpoint.authMode ?? 'api_key',
          kind: existingEndpoint.kind ?? 'custom',
          protocol: existingEndpoint.protocol ?? 'anthropic',
          transport: existingEndpoint.transport ?? 'direct',
        })
      : 'anthropic')
  const template = getConnectionTemplate(nextType, update.endpointId)
  const currentDefaultModel = getEndpointDefaultModel(next, update.endpointId)
  const previousDefaultModelId = trimValue(existingEndpoint?.defaultModelId)
  const nextRemoteModel = hasOwn(update, 'remoteModel')
    ? trimValue(update.remoteModel) ??
      getDefaultRemoteModelForConnectionType(nextType)
    : trimValue(currentDefaultModel?.remoteModel) ??
      getDefaultRemoteModelForConnectionType(nextType)

  const nextMetadata =
    nextType ===
    (existingEndpoint
      ? getInferenceConnectionType({
          authMode: existingEndpoint.authMode ?? 'api_key',
          kind: existingEndpoint.kind ?? 'custom',
          protocol: existingEndpoint.protocol ?? 'anthropic',
          transport: existingEndpoint.transport ?? 'direct',
        })
      : nextType)
      ? {
          ...(existingEndpoint?.metadata ?? {}),
        }
      : {}

  for (const [key, value] of Object.entries(update.metadata ?? {})) {
    const normalizedValue = trimValue(value)
    if (normalizedValue === undefined) {
      delete nextMetadata[key]
    } else {
      nextMetadata[key] = normalizedValue
    }
  }

  const endpoint: EndpointConfig = {
    ...(existingEndpoint ? cloneEndpoint(existingEndpoint) : template),
    ...template,
    id: update.endpointId,
    name:
      hasOwn(update, 'name')
        ? trimValue(update.name) ?? template.name
        : trimValue(existingEndpoint?.name) ?? template.name,
    authMode:
      hasOwn(update, 'authMode') && update.authMode
        ? update.authMode
        : existingEndpoint?.authMode ?? template.authMode,
    enabled: true,
    ...(hasOwn(update, 'baseUrl')
      ? (() => {
          const baseUrl = trimValue(update.baseUrl)
          return baseUrl ? { baseUrl } : {}
        })()
      : trimValue(existingEndpoint?.baseUrl)
        ? { baseUrl: trimValue(existingEndpoint?.baseUrl) }
        : trimValue(template.baseUrl)
          ? { baseUrl: trimValue(template.baseUrl) }
          : {}),
    ...(Object.keys(nextMetadata).length > 0 ? { metadata: nextMetadata } : {}),
  }

  const reusableModel = findEndpointModels(next, update.endpointId).find(
    model => trimValue(model.remoteModel) === nextRemoteModel,
  )
  const nextModelId =
    reusableModel?.id ??
    (currentDefaultModel?.remoteModel === nextRemoteModel
      ? currentDefaultModel.id
      : getUniqueModelId(next, update.endpointId, nextRemoteModel))

  endpoint.defaultModelId = nextModelId

  const preservedModels = (next.models ?? []).filter(model => {
    if (model.endpointId !== update.endpointId) {
      return true
    }

    if (model.id === nextModelId) {
      return false
    }

    if (
      model.id === previousDefaultModelId &&
      shouldRemoveAutoManagedModel(model)
    ) {
      return false
    }

    return true
  })

  const nextModel: ModelEntryConfig = {
    ...(reusableModel ? cloneModel(reusableModel) : {}),
    id: nextModelId,
    label: nextRemoteModel,
    endpointId: update.endpointId,
    remoteModel: nextRemoteModel,
    enabled: true,
    isDefaultCandidate: true,
  }

  next.endpoints = [
    ...(next.endpoints ?? []).filter(endpoint => endpoint.id !== update.endpointId),
    endpoint,
  ]
  next.models = [...preservedModels, nextModel]

  if (next.defaults?.modelId === previousDefaultModelId) {
    next.defaults = {
      ...(next.defaults ?? {}),
      modelId: nextModelId,
    }
  }

  return next
}

export function removeInferenceConnection(
  inference: InferenceSettings | null | undefined,
  endpointId: string,
): InferenceSettings {
  const next = cloneInferenceSettings(inference)
  const removedModelIds = new Set(
    findEndpointModels(next, endpointId).map(model => model.id),
  )

  next.endpoints = (next.endpoints ?? []).filter(endpoint => endpoint.id !== endpointId)
  next.models = (next.models ?? []).filter(model => model.endpointId !== endpointId)

  if (
    next.defaults?.modelId &&
    removedModelIds.has(next.defaults.modelId)
  ) {
    const fallbackModel = next.models?.find(model => model.enabled !== false)
    next.defaults = {
      ...(next.defaults ?? {}),
      modelId: fallbackModel?.id,
    }
  }

  return next
}

export function setInferenceDefaultModel(
  inference: InferenceSettings | null | undefined,
  modelId: string | undefined,
): InferenceSettings {
  const next = cloneInferenceSettings(inference)

  next.defaults = {
    ...(next.defaults ?? {}),
    modelId: trimValue(modelId),
  }

  return next
}
