import { describe, expect, test } from 'bun:test'
import { ALL_MODEL_CONFIGS } from '../model/configs.js'
import {
  addInferenceConnection,
  buildEditableInferenceSettings,
  buildInferenceSettingsWritePatch,
  getEndpointDefaultModel,
  getInferenceConnectionType,
  removeInferenceConnection,
  setInferenceDefaultModel,
  updateInferenceConnection,
} from './registry.js'

describe('inference registry helpers', () => {
  test('builds editable inference settings from legacy config', () => {
    const inference = buildEditableInferenceSettings({
      settingsApi: {
        compatibility: 'openai',
        mode: 'custom',
        baseUrl: 'https://gateway.example.com/v1',
        model: 'gpt-5-mini',
      },
      settingsModel: 'gpt-5-mini',
    })

    expect(inference.endpoints?.[0]).toMatchObject({
      protocol: 'openai',
      transport: 'direct',
    })
    expect(inference.defaults?.modelId).toBe('gpt-5-mini')
  })

  test('adds endpoint-scoped model ids for new connections', () => {
    const { endpointId, inference } = addInferenceConnection(undefined, 'openai')

    expect(endpointId).toBe('openai')
    expect(inference.endpoints?.[0]).toMatchObject({
      id: 'openai',
      protocol: 'openai',
      transport: 'direct',
    })
    expect(inference.endpoints?.[0]?.defaultModelId).toBe(
      `openai::${ALL_MODEL_CONFIGS.sonnet45.openaiCompatible}`,
    )
    expect(getEndpointDefaultModel(inference, endpointId)).toMatchObject({
      endpointId: 'openai',
      remoteModel: ALL_MODEL_CONFIGS.sonnet45.openaiCompatible,
    })
  })

  test('builds write patch that clears legacy api state during inference migration', () => {
    const added = addInferenceConnection(undefined, 'openai')
    const patch = buildInferenceSettingsWritePatch(added.inference, {
      FOO: 'bar',
      OPENAI_API_KEY: 'sk-test',
      OPENAI_BASE_URL: 'https://gateway.example.com/v1',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'gpt-4.1-mini',
    })

    expect(patch.inference).toEqual(added.inference)
    expect(patch.inference).not.toBe(added.inference)
    expect(patch.model).toBeUndefined()
    expect(patch.api).toBeUndefined()
    expect(patch.env).toEqual({
      FOO: 'bar',
      OPENAI_API_KEY: undefined,
      OPENAI_BASE_URL: undefined,
      ANTHROPIC_DEFAULT_OPUS_MODEL: undefined,
    })
  })

  test('updates endpoint model and keeps defaults aligned', () => {
    const added = addInferenceConnection(undefined, 'openai')
    const withDefault = setInferenceDefaultModel(
      added.inference,
      added.inference.endpoints?.[0]?.defaultModelId,
    )
    const updated = updateInferenceConnection(withDefault, {
      endpointId: added.endpointId,
      remoteModel: 'gpt-4.1',
    })

    expect(getEndpointDefaultModel(updated, added.endpointId)).toMatchObject({
      remoteModel: 'gpt-4.1',
    })
    expect(updated.defaults?.modelId).toBe(
      updated.endpoints?.[0]?.defaultModelId,
    )
  })

  test('removes endpoints and resets removed defaults', () => {
    const first = addInferenceConnection(undefined, 'openai')
    const second = addInferenceConnection(first.inference, 'anthropic')
    const activeModelId = second.inference.endpoints?.find(
      endpoint => endpoint.id === second.endpointId,
    )?.defaultModelId
    const withDefault = setInferenceDefaultModel(second.inference, activeModelId)
    const removed = removeInferenceConnection(withDefault, second.endpointId)

    expect(removed.endpoints?.map(endpoint => endpoint.id)).toEqual(['openai'])
    expect(removed.models?.every(model => model.endpointId !== second.endpointId)).toBe(
      true,
    )
    expect(removed.defaults?.modelId).toBe(
      removed.endpoints?.[0]?.defaultModelId,
    )
  })

  test('maps resolved endpoints to user-facing connection types', () => {
    expect(
      getInferenceConnectionType({
        authMode: 'claude_oauth',
        kind: 'official_claude',
        protocol: 'anthropic',
        transport: 'direct',
      }),
    ).toBe('official')

    expect(
      getInferenceConnectionType({
        authMode: 'azure_ad',
        kind: 'custom',
        protocol: 'anthropic',
        transport: 'foundry',
      }),
    ).toBe('foundry')

    expect(
      getInferenceConnectionType({
        authMode: 'chatgpt_oauth',
        kind: 'custom',
        protocol: 'openai',
        transport: 'direct',
      }),
    ).toBe('chatgpt')
  })
})
