import type { ModelOption } from '../model/modelOptions.js'
import type { InferenceSettings } from '../settings/types.js'
import { resolveApiConfig } from '../settings/apiConfig.js'
import type { DeepImmutable } from '../../types/utils.js'
import {
  buildEditableInferenceSettings,
  cloneInferenceSettings,
} from './registry.js'
import {
  hasInferenceModelInventory,
  resolveInferenceConfig,
} from './resolve.js'
import type { ResolveInferenceConfigOptions } from './types.js'

export type InferenceModelPickerOption = ModelOption & {
  remoteModel: string
}

export type DerivedInferenceModelPickerState = {
  editableInference: InferenceSettings
  options: InferenceModelPickerOption[]
  shouldUseInferenceModelPicker: boolean
}

type InferenceSettingsSnapshot =
  | DeepImmutable<InferenceSettings>
  | InferenceSettings
  | null
  | undefined

function trimValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase()
}

function hasInferenceRoutingConfig(
  inference: InferenceSettingsSnapshot,
): boolean {
  return Boolean(
    trimValue(inference?.defaults?.modelId) ||
      (inference?.endpoints?.length ?? 0) > 0 ||
      (inference?.models?.length ?? 0) > 0,
  )
}

function findConfiguredModel(
  inference: InferenceSettingsSnapshot,
  identifier: string,
) {
  const resolved = resolveInferenceConfig({
    allowBuiltinOfficialFallback: false,
    inference: inference as InferenceSettings | null | undefined,
  })
  const normalizedIdentifier = normalizeIdentifier(identifier)

  return resolved.models.find(
    model =>
      normalizeIdentifier(model.id) === normalizedIdentifier ||
      normalizeIdentifier(model.remoteModel) === normalizedIdentifier ||
      model.aliases.some(
        alias => normalizeIdentifier(alias) === normalizedIdentifier,
      ),
  )
}

function scopeInferenceToEndpoint(
  inference: InferenceSettingsSnapshot,
  endpointId: string | null | undefined,
): InferenceSettings {
  const scopedEndpointId = trimValue(endpointId)
  const next = cloneInferenceSettings(
    inference as InferenceSettings | null | undefined,
  )

  if (!scopedEndpointId) {
    return next
  }

  const endpointIds = new Set(
    (next.endpoints ?? [])
      .map(endpoint => trimValue(endpoint.id))
      .filter((value): value is string => value !== undefined),
  )

  if (!endpointIds.has(scopedEndpointId)) {
    return next
  }

  const endpoints = (next.endpoints ?? []).filter(
    endpoint => trimValue(endpoint.id) === scopedEndpointId,
  )
  const models = (next.models ?? []).filter(
    model => trimValue(model.endpointId) === scopedEndpointId,
  )
  const defaultModelId = trimValue(next.defaults?.modelId)
  const scopedDefaultModelId =
    defaultModelId &&
    models.some(
      model =>
        trimValue(model.id) === defaultModelId ||
        trimValue(model.remoteModel) === defaultModelId,
    )
      ? defaultModelId
      : trimValue(endpoints[0]?.defaultModelId) ?? trimValue(models[0]?.id)

  return {
    ...next,
    endpoints,
    models,
    ...(scopedDefaultModelId !== undefined
      ? {
          defaults: {
            ...(next.defaults ?? {}),
            modelId: scopedDefaultModelId,
          },
        }
      : {}),
  }
}

export function buildInferenceModelPickerOptions(
  inference: InferenceSettingsSnapshot,
): InferenceModelPickerOption[] {
  if (!hasInferenceRoutingConfig(inference)) {
    return []
  }

  const resolved = resolveInferenceConfig({
    allowBuiltinOfficialFallback: false,
    inference: inference as InferenceSettings | null | undefined,
  })

  return resolved.models.map(model => {
    const endpoint = resolved.endpoints.find(
      candidate => candidate.id === model.endpointId,
    )

    return {
      value: model.id,
      label: model.label,
      description: `${endpoint?.name ?? model.endpointId} · ${model.remoteModel}`,
      remoteModel: model.remoteModel,
    }
  })
}

export function deriveInferenceModelPickerState(
  options: ResolveInferenceConfigOptions,
): DerivedInferenceModelPickerState {
  const editableInference = hasInferenceModelInventory(options.inference)
    ? buildEditableInferenceSettings({
        ...options,
        allowBuiltinOfficialFallback: false,
        inference: options.inference,
      })
    : buildEditableInferenceSettings({
        ...options,
        allowBuiltinOfficialFallback: false,
        legacyEnv: options.legacyEnv,
        settingsApi: options.settingsApi,
      })
  const pickerOptions = buildInferenceModelPickerOptions(editableInference)
  const resolvedApiConfig = resolveApiConfig({
    legacyEnv: options.legacyEnv,
    settingsApi: options.settingsApi,
  })
  const shouldUseInferenceModelPicker =
    pickerOptions.length > 0 &&
    (hasInferenceModelInventory(options.inference) ||
      resolvedApiConfig.source !== 'default')

  return {
    editableInference,
    options: pickerOptions,
    shouldUseInferenceModelPicker,
  }
}

export function scopeInferenceModelPickerStateToEndpoint(
  state: DerivedInferenceModelPickerState,
  endpointId: string | null | undefined,
): DerivedInferenceModelPickerState {
  if (!state.shouldUseInferenceModelPicker) {
    return state
  }

  const editableInference = scopeInferenceToEndpoint(
    state.editableInference,
    endpointId,
  )

  return {
    ...state,
    editableInference,
    options: buildInferenceModelPickerOptions(editableInference),
  }
}

export function getInferenceModelDisplayLabel(
  inference: InferenceSettingsSnapshot,
  model: string | null | undefined,
): string | undefined {
  if (!hasInferenceRoutingConfig(inference)) {
    return undefined
  }

  const selectedModel = trimValue(model)
  if (!selectedModel) {
    return resolveInferenceConfig({
      allowBuiltinOfficialFallback: false,
      inference: inference as InferenceSettings | null | undefined,
    }).selectedModel?.label
  }

  return findConfiguredModel(inference, selectedModel)?.label
}

export function normalizeInferenceModelSelection(
  inference: InferenceSettingsSnapshot,
  model: string | null | undefined,
): string | undefined {
  const selectedModel = trimValue(model)
  if (!selectedModel || !hasInferenceRoutingConfig(inference)) {
    return undefined
  }

  return findConfiguredModel(inference, selectedModel)?.id
}
