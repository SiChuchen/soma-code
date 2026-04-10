import { describe, expect, test } from 'bun:test'
import {
  buildInferenceModelPickerOptions,
  deriveInferenceModelPickerState,
  getInferenceModelDisplayLabel,
  normalizeInferenceModelSelection,
  scopeInferenceModelPickerStateToEndpoint,
} from './modelPicker.js'
import {
  addInferenceConnection,
  setInferenceDefaultModel,
  updateInferenceConnection,
} from './registry.js'

describe('inference model picker helpers', () => {
  test('builds picker options from configured inference models', () => {
    const openai = addInferenceConnection(undefined, 'openai')
    const anthropic = addInferenceConnection(openai.inference, 'anthropic')
    const inference = updateInferenceConnection(anthropic.inference, {
      endpointId: openai.endpointId,
      name: 'Gateway',
      remoteModel: 'gpt-5-mini',
    })

    expect(buildInferenceModelPickerOptions(inference)).toEqual([
      {
        value: `anthropic::claude-sonnet-4-6`,
        label: 'claude-sonnet-4-6',
        description: 'Anthropic-compatible · claude-sonnet-4-6',
        remoteModel: 'claude-sonnet-4-6',
      },
      {
        value: 'openai::gpt-5-mini',
        label: 'gpt-5-mini',
        description: 'Gateway · gpt-5-mini',
        remoteModel: 'gpt-5-mini',
      },
    ])
  })

  test('resolves display labels and configured model ids', () => {
    const openai = addInferenceConnection(undefined, 'openai')
    const inference = updateInferenceConnection(openai.inference, {
      endpointId: openai.endpointId,
      remoteModel: 'gpt-5-mini',
    })
    const defaultModelId = inference.endpoints?.[0]?.defaultModelId
    const withDefault = setInferenceDefaultModel(inference, defaultModelId)

    expect(getInferenceModelDisplayLabel(withDefault, null)).toBe('gpt-5-mini')
    expect(getInferenceModelDisplayLabel(withDefault, 'gpt-5-mini')).toBe(
      'gpt-5-mini',
    )
    expect(normalizeInferenceModelSelection(withDefault, 'gpt-5-mini')).toBe(
      'openai::gpt-5-mini',
    )
  })

  test('uses derived inference picker options for legacy settings.api routing', () => {
    const state = deriveInferenceModelPickerState({
      settingsApi: {
        compatibility: 'openai',
        mode: 'custom',
        customName: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1',
        model: 'MiniMax-M2.7',
      },
      settingsModel: 'opus[1m]',
    })

    expect(state.shouldUseInferenceModelPicker).toBe(true)
    expect(state.options).toEqual([
      {
        value: 'MiniMax-M2.7',
        label: 'MiniMax-M2.7',
        description: 'MiniMax · MiniMax-M2.7',
        remoteModel: 'MiniMax-M2.7',
      },
    ])
  })

  test('falls back to legacy configured models when inference only stores defaults', () => {
    const state = deriveInferenceModelPickerState({
      inference: {
        version: 1,
        defaults: {
          modelId: 'MiniMax-M2.7',
        },
      },
      settingsApi: {
        compatibility: 'anthropic',
        mode: 'preset',
        preset: 'minimax',
      },
    })

    expect(state.shouldUseInferenceModelPicker).toBe(true)
    expect(state.options).toEqual([
      {
        value: 'MiniMax-M2.7',
        label: 'MiniMax-M2.7',
        description: 'MiniMax · MiniMax-M2.7',
        remoteModel: 'MiniMax-M2.7',
      },
    ])
  })

  test('matches configured legacy models case-insensitively by remote model', () => {
    const state = deriveInferenceModelPickerState({
      settingsApi: {
        compatibility: 'openai',
        mode: 'custom',
        customName: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1',
        model: 'MiniMax-M2.7',
      },
    })

    expect(
      normalizeInferenceModelSelection(
        state.editableInference,
        'minimax-m2.7',
      ),
    ).toBe('MiniMax-M2.7')
    expect(
      getInferenceModelDisplayLabel(state.editableInference, 'minimax-m2.7'),
    ).toBe('MiniMax-M2.7')
  })

  test('scopes picker state to the active endpoint', () => {
    const official = addInferenceConnection(undefined, 'official')
    const glm = addInferenceConnection(official.inference, 'anthropic')
    const inference = updateInferenceConnection(glm.inference, {
      endpointId: glm.endpointId,
      name: 'Zhipu GLM',
      remoteModel: 'glm-5.1',
    })
    const state = deriveInferenceModelPickerState({
      inference,
    })
    const scoped = scopeInferenceModelPickerStateToEndpoint(
      state,
      glm.endpointId,
    )

    expect(state.options).toEqual([
      {
        value: 'claude-official::claude-sonnet-4-6',
        label: 'claude-sonnet-4-6',
        description: 'Official account · claude-sonnet-4-6',
        remoteModel: 'claude-sonnet-4-6',
      },
      {
        value: 'anthropic::glm-5.1',
        label: 'glm-5.1',
        description: 'Zhipu GLM · glm-5.1',
        remoteModel: 'glm-5.1',
      },
    ])
    expect(scoped.options).toEqual([
      {
        value: 'anthropic::glm-5.1',
        label: 'glm-5.1',
        description: 'Zhipu GLM · glm-5.1',
        remoteModel: 'glm-5.1',
      },
    ])
    expect(scoped.editableInference.defaults?.modelId).toBe('anthropic::glm-5.1')
  })

  test('does not synthesize picker options from only top-level settings.model', () => {
    const state = deriveInferenceModelPickerState({
      settingsModel: 'opus[1m]',
    })

    expect(state.shouldUseInferenceModelPicker).toBe(false)
    expect(state.options).toEqual([])
  })

  test('returns empty picker options for empty inference config', () => {
    const state = deriveInferenceModelPickerState({
      inference: {
        version: 1,
      },
    })

    expect(state.options).toEqual([])
    expect(state.shouldUseInferenceModelPicker).toBe(false)
  })
})
