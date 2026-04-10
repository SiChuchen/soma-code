import { describe, expect, test } from 'bun:test'
import { ALL_MODEL_CONFIGS } from '../model/configs.js'
import { resolveInferenceConfig } from './resolve.js'

describe('resolveInferenceConfig', () => {
  test('returns a built-in Claude default when no config is present', () => {
    const resolved = resolveInferenceConfig({})

    expect(resolved.source).toBe('default')
    expect(resolved.selectedEndpoint).toMatchObject({
      authMode: 'claude_oauth',
      id: 'claude-official',
      kind: 'official_claude',
      protocol: 'anthropic',
      transport: 'direct',
    })
    expect(resolved.defaultModelId).toBe(ALL_MODEL_CONFIGS.sonnet46.firstParty)
    expect(resolved.selectedModel.remoteModel).toBe(
      ALL_MODEL_CONFIGS.sonnet46.firstParty,
    )
  })

  test('imports settings.api into a direct OpenAI-compatible endpoint', () => {
    const resolved = resolveInferenceConfig({
      settingsApi: {
        compatibility: 'openai',
        mode: 'custom',
        customName: 'Internal Gateway',
        baseUrl: 'https://gateway.example.com/v1',
        model: 'gpt-4.1-mini',
        apiKey: 'sk-test',
      },
    })

    expect(resolved.source).toBe('settingsApi')
    expect(resolved.selectedEndpoint).toMatchObject({
      authMode: 'api_key',
      baseUrl: 'https://gateway.example.com/v1',
      kind: 'custom',
      name: 'Internal Gateway',
      protocol: 'openai',
      transport: 'direct',
    })
    expect(resolved.defaultModelId).toBe('gpt-4.1-mini')
    expect(resolved.selectedModel.remoteModel).toBe('gpt-4.1-mini')
  })

  test('imports OpenAI runtime metadata needed for client construction', () => {
    const resolved = resolveInferenceConfig({
      settingsApi: {
        compatibility: 'openai',
        mode: 'custom',
        baseUrl: 'https://gateway.example.com/v1',
        model: 'gpt-5-mini',
        openai: {
          apiFormat: 'responses',
          apiKeyHeader: 'x-api-key',
          apiKeyScheme: 'Token',
          disableAuth: true,
        },
      },
    })

    expect(resolved.selectedEndpoint.metadata).toEqual({
      apiFormat: 'responses',
      apiKeyHeader: 'x-api-key',
      apiKeyScheme: 'Token',
      disableAuth: 'true',
    })
  })

  test('imports legacy anthropic-compatible env into a custom direct endpoint', () => {
    const resolved = resolveInferenceConfig({
      legacyEnv: {
        ANTHROPIC_API_KEY: 'ak-test',
        ANTHROPIC_BASE_URL: 'https://compat.example.com',
        ANTHROPIC_MODEL: 'claude-sonnet-4-5',
      },
    })

    expect(resolved.source).toBe('legacyEnv')
    expect(resolved.selectedEndpoint).toMatchObject({
      authMode: 'api_key',
      baseUrl: 'https://compat.example.com',
      kind: 'custom',
      protocol: 'anthropic',
      transport: 'direct',
    })
    expect(resolved.selectedModel.remoteModel).toBe('claude-sonnet-4-5')
  })

  test('maps top-level settings.model to defaults.modelId during legacy import', () => {
    const resolved = resolveInferenceConfig({
      settingsApi: {
        compatibility: 'openai',
        mode: 'custom',
        baseUrl: 'https://gateway.example.com/v1',
      },
      settingsModel: 'gpt-5-mini',
    })

    expect(resolved.source).toBe('settingsApi')
    expect(resolved.config.defaults?.modelId).toBe('gpt-5-mini')
    expect(resolved.selectedModel.id).toBe('gpt-5-mini')
    expect(resolved.models.map(model => model.id)).toEqual(
      expect.arrayContaining(['gpt-5-mini']),
    )
  })

  test('prefers explicit settings.inference over legacy config inputs', () => {
    const resolved = resolveInferenceConfig({
      inference: {
        version: 1,
        endpoints: [
          {
            id: 'custom-endpoint',
            name: 'Custom Endpoint',
            kind: 'custom',
            transport: 'direct',
            protocol: 'openai',
            authMode: 'api_key',
            enabled: true,
            baseUrl: 'https://override.example.com/v1',
            defaultModelId: 'override-model',
          },
        ],
        models: [
          {
            id: 'override-model',
            label: 'Override Model',
            endpointId: 'custom-endpoint',
            remoteModel: 'override-model',
            enabled: true,
          },
        ],
        defaults: {
          modelId: 'override-model',
        },
      },
      settingsApi: {
        compatibility: 'openai',
        mode: 'custom',
        baseUrl: 'https://ignored.example.com/v1',
        model: 'ignored-model',
      },
      settingsModel: 'ignored-default',
    })

    expect(resolved.source).toBe('inference')
    expect(resolved.selectedEndpoint.id).toBe('custom-endpoint')
    expect(resolved.selectedModel.id).toBe('override-model')
  })

  test('imports transport-aware legacy Bedrock config', () => {
    const resolved = resolveInferenceConfig({
      legacyEnv: {
        CLAUDE_CODE_USE_BEDROCK: '1',
        ANTHROPIC_BEDROCK_BASE_URL: 'https://bedrock.example.com',
        AWS_REGION: 'us-west-2',
      },
    })

    expect(resolved.source).toBe('legacyEnv')
    expect(resolved.selectedEndpoint).toMatchObject({
      authMode: 'aws',
      baseUrl: 'https://bedrock.example.com',
      kind: 'custom',
      transport: 'bedrock',
      protocol: 'anthropic',
    })
    expect(resolved.selectedEndpoint.metadata).toEqual({
      awsRegion: 'us-west-2',
    })
    expect(resolved.selectedModel.remoteModel).toBe(
      ALL_MODEL_CONFIGS.sonnet45.bedrock,
    )
  })
})
