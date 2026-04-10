import { ALL_MODEL_CONFIGS } from '../model/configs.js'
import { MODEL_ALIASES } from '../model/aliases.js'
import type { APIProvider } from '../model/providers.js'
import type { ModelSetting } from '../model/model.js'
import type { InferenceSettings, SettingsJson } from '../settings/types.js'
import { hasInferenceModelInventory, resolveInferenceConfig } from './resolve.js'
import type {
  ResolvedEndpoint,
  ResolvedInferenceConfig,
  ResolvedModelEntry,
} from './types.js'

type ModelSettingsSnapshot =
  | {
      readonly api?: unknown
      readonly env?: Record<string, string | undefined>
      readonly inference?: unknown
      readonly model?: string | null
    }
  | null
  | undefined

export type InferenceModelRouteSource =
  | 'builtin'
  | 'explicit'
  | 'session'
  | 'base'
  | 'inferenceDefault'
  | 'endpointDefault'
  | 'settingsApi'
  | 'settingsModel'
  | 'legacyEnv'

export type ResolvedInferenceModelRoute = {
  source: InferenceModelRouteSource
  setting?: string
  exactMatch: boolean
  inference: ResolvedInferenceConfig
  selectedEndpoint: ResolvedEndpoint
  selectedModel: ResolvedModelEntry
}

type PersistedModelPreference = {
  source: Exclude<
    InferenceModelRouteSource,
    'builtin' | 'explicit' | 'session' | 'base'
  >
  setting: string
}

function trimValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normalizeModelAlias(value: string): string {
  return value.toLowerCase()
}

function resolveInferenceFromSettings(
  settings: ModelSettingsSnapshot,
  legacyEnv?: Record<string, string | undefined>,
): ResolvedInferenceConfig {
  const effectiveLegacyEnv: Record<string, string | undefined> = {
    ...process.env,
    ...(legacyEnv ?? {}),
    ...(settings?.env ?? {}),
  }

  return resolveInferenceConfig({
    inference: settings?.inference as SettingsJson['inference'] | undefined,
    legacyEnv: effectiveLegacyEnv,
    settingsApi: settings?.api as SettingsJson['api'] | undefined,
    settingsModel: settings?.model,
  })
}

function hasInferenceRoutingConfig(
  inference: InferenceSettings | null | undefined,
): boolean {
  return Boolean(
    trimValue(inference?.defaults?.modelId) ||
      (inference?.endpoints?.length ?? 0) > 0 ||
      (inference?.models?.length ?? 0) > 0,
  )
}

function getPersistedModelPreference(
  settings: ModelSettingsSnapshot,
  legacyEnv?: Record<string, string | undefined>,
): PersistedModelPreference | null {
  if (!settings) {
    return null
  }

  const resolved = resolveInferenceFromSettings(settings, legacyEnv)
  const inference = settings.inference as SettingsJson['inference'] | undefined

  if (inference !== undefined) {
    const explicitInferenceDefault = trimValue(inference?.defaults?.modelId)

    if (explicitInferenceDefault) {
      return {
        source: 'inferenceDefault',
        setting: explicitInferenceDefault,
      }
    }

    if (!hasInferenceRoutingConfig(inference)) {
      return null
    }

    return {
        source: 'endpointDefault',
      setting: resolved.defaultModelId ?? resolved.selectedModel.id,
    }
  }

  if (trimValue(settings.model)) {
    return {
      source: 'settingsModel',
      setting: trimValue(settings.model)!,
    }
  }

  if (resolved.source === 'settingsApi') {
    return {
      source: 'settingsApi',
      setting: resolved.defaultModelId ?? resolved.selectedModel.id,
    }
  }

  if (resolved.source === 'legacyEnv') {
    return {
      source: 'legacyEnv',
      setting: resolved.defaultModelId ?? resolved.selectedModel.id,
    }
  }

  return null
}

function getProviderForEndpoint(endpoint: ResolvedEndpoint): APIProvider {
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

  return endpoint.baseUrl && endpoint.baseUrl !== 'https://api.anthropic.com'
    ? 'anthropicCompatible'
    : 'firstParty'
}

function getDefaultSonnetModelForEndpoint(endpoint: ResolvedEndpoint): string {
  const provider = getProviderForEndpoint(endpoint)
  return provider === 'firstParty'
    ? ALL_MODEL_CONFIGS.sonnet46.firstParty
    : ALL_MODEL_CONFIGS.sonnet45[provider]
}

function getDefaultOpusModelForEndpoint(endpoint: ResolvedEndpoint): string {
  return ALL_MODEL_CONFIGS.opus46[getProviderForEndpoint(endpoint)]
}

function getDefaultHaikuModelForEndpoint(endpoint: ResolvedEndpoint): string {
  return ALL_MODEL_CONFIGS.haiku45[getProviderForEndpoint(endpoint)]
}

function resolveAliasedModelForEndpoint(
  modelSetting: string,
  endpoint: ResolvedEndpoint,
): string {
  const trimmed = modelSetting.trim()
  const has1mTag = /\[1m]$/i.test(trimmed)
  const normalized = normalizeModelAlias(
    has1mTag ? trimmed.replace(/\[1m]$/i, '').trim() : trimmed,
  )

  if (!(MODEL_ALIASES as readonly string[]).includes(normalized)) {
    return has1mTag ? `${trimmed.replace(/\[1m]$/i, '').trim()}[1m]` : trimmed
  }

  let resolved = trimmed

  switch (normalized) {
    case 'opusplan':
      resolved = getDefaultSonnetModelForEndpoint(endpoint)
      break
    case 'sonnet':
      resolved = getDefaultSonnetModelForEndpoint(endpoint)
      break
    case 'haiku':
      resolved = getDefaultHaikuModelForEndpoint(endpoint)
      break
    case 'opus':
    case 'best':
      resolved = getDefaultOpusModelForEndpoint(endpoint)
      break
    default:
      resolved = trimmed
      break
  }

  return has1mTag ? `${resolved}[1m]` : resolved
}

function findModelByIdentifier(
  models: ResolvedModelEntry[],
  identifier: string,
): ResolvedModelEntry | undefined {
  const normalizedIdentifier = normalizeModelAlias(identifier)

  return models.find(
    model =>
      normalizeModelAlias(model.id) === normalizedIdentifier ||
      normalizeModelAlias(model.remoteModel) === normalizedIdentifier ||
      model.aliases.some(
        alias => normalizeModelAlias(alias) === normalizedIdentifier,
      ),
  )
}

function createSyntheticModel(
  endpoint: ResolvedEndpoint,
  modelId: string,
): ResolvedModelEntry {
  return {
    id: modelId,
    label: modelId,
    endpointId: endpoint.id,
    remoteModel: resolveAliasedModelForEndpoint(modelId, endpoint),
    aliases: [],
    enabled: true,
    isDefaultCandidate: false,
  }
}

export function getPersistedModelSettingFromSettings(
  settings: ModelSettingsSnapshot,
  legacyEnv?: Record<string, string | undefined>,
): string | undefined {
  return getPersistedModelPreference(settings, legacyEnv)?.setting
}

export function buildPersistedModelSettingsPatch(
  settings: ModelSettingsSnapshot,
  model: ModelSetting | undefined,
): SettingsJson {
  const inference = settings?.inference as SettingsJson['inference'] | undefined
  const shouldPersistToInference = hasInferenceModelInventory(inference)

  if (model === undefined || model === null) {
    return shouldPersistToInference
      ? {
          model: undefined,
          inference: {
            version: 1,
            defaults: {
              modelId: undefined,
            },
          },
        }
      : {
          model: undefined,
          ...(inference !== undefined ? { inference: undefined } : {}),
        }
  }

  if (!shouldPersistToInference) {
    return {
      model,
      ...(inference !== undefined ? { inference: undefined } : {}),
    }
  }

  return {
    model: undefined,
    inference: {
      version: 1,
      defaults: {
        modelId: model,
      },
    },
  }
}

export function resolveSelectedModelRoute(options: {
  explicitModel?: string | undefined
  sessionModel?: string | undefined
  baseModel?: string | undefined
  legacyEnv?: Record<string, string | undefined>
  settings?: ModelSettingsSnapshot
}): ResolvedInferenceModelRoute {
  const inference = resolveInferenceFromSettings(
    options.settings,
    options.legacyEnv,
  )
  const persistedPreference = getPersistedModelPreference(
    options.settings,
    options.legacyEnv,
  )
  const explicitModel = trimValue(options.explicitModel)
  const sessionModel = trimValue(options.sessionModel)
  const baseModel = trimValue(options.baseModel)
  const selectedSetting =
    explicitModel ??
    sessionModel ??
    baseModel ??
    persistedPreference?.setting

  if (!selectedSetting) {
    return {
      source: 'builtin',
      exactMatch: true,
      inference,
      selectedEndpoint: inference.selectedEndpoint,
      selectedModel: inference.selectedModel,
    }
  }

  const matchedModel = findModelByIdentifier(inference.models, selectedSetting)
  const selectedModel =
    matchedModel ?? createSyntheticModel(inference.selectedEndpoint, selectedSetting)
  const selectedEndpoint =
    inference.endpoints.find(endpoint => endpoint.id === selectedModel.endpointId) ??
    inference.selectedEndpoint

  return {
    source: explicitModel
      ? 'explicit'
      : sessionModel
        ? 'session'
        : baseModel
          ? 'base'
          : (persistedPreference?.source ?? 'builtin'),
    setting: selectedSetting,
    exactMatch: matchedModel !== undefined,
    inference,
    selectedEndpoint,
    selectedModel,
  }
}
