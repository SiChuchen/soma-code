import type { ModelOption } from '../model/modelOptions.js'
import type { InferenceSettings } from '../settings/types.js'
import { resolveApiConfig } from '../settings/apiConfig.js'
import type { DeepImmutable } from '../../types/utils.js'
import { buildEditableInferenceSettings } from './registry.js'
import { hasInferenceModelInventory, resolveInferenceConfig } from './resolve.js'
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
    inference: inference as InferenceSettings | null | undefined,
  })
  const normalizedIdentifier = normalizeIdentifier(identifier)

  return resolved.models.find(
    model =>
      model.id === identifier ||
      model.remoteModel === identifier ||
      model.aliases.some(
        alias => normalizeIdentifier(alias) === normalizedIdentifier,
      ),
  )
}

export function buildInferenceModelPickerOptions(
  inference: InferenceSettingsSnapshot,
): InferenceModelPickerOption[] {
  if (!hasInferenceRoutingConfig(inference)) {
    return []
  }

  const resolved = resolveInferenceConfig({
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
        inference: options.inference,
      })
    : buildEditableInferenceSettings({
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
      inference: inference as InferenceSettings | null | undefined,
    }).selectedModel.label
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
