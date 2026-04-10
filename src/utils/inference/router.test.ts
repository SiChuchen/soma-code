import { describe, expect, test } from 'bun:test'
import { ALL_MODEL_CONFIGS } from '../model/configs.js'
import {
  buildPersistedModelSettingsPatch,
  getPersistedModelSettingFromSettings,
  resolveSelectedModelRoute,
} from './router.js'

const ORIGINAL_ENV = {
  CLAUDE_CODE_USE_OPENAI_COMPAT: process.env.CLAUDE_CODE_USE_OPENAI_COMPAT,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
}

function restoreEnv(
  key: keyof typeof ORIGINAL_ENV,
  value: string | undefined,
): void {
  if (value === undefined) {
    delete process.env[key]
    return
  }

  process.env[key] = value
}

function restoreAllEnv(): void {
  restoreEnv(
    'CLAUDE_CODE_USE_OPENAI_COMPAT',
    ORIGINAL_ENV.CLAUDE_CODE_USE_OPENAI_COMPAT,
  )
  restoreEnv('OPENAI_BASE_URL', ORIGINAL_ENV.OPENAI_BASE_URL)
  restoreEnv('OPENAI_MODEL', ORIGINAL_ENV.OPENAI_MODEL)
}

describe('inference router', () => {
  test('extracts explicit inference default model ids', () => {
    expect(
      getPersistedModelSettingFromSettings({
        inference: {
          version: 1,
          endpoints: [
            {
              id: 'custom-endpoint',
              name: 'Custom Endpoint',
              transport: 'direct',
              protocol: 'openai',
              authMode: 'api_key',
            },
          ],
          models: [
            {
              id: 'gpt-5-mini',
              label: 'GPT-5 mini',
              endpointId: 'custom-endpoint',
              remoteModel: 'gpt-5-mini',
            },
          ],
          defaults: {
            modelId: 'gpt-5-mini',
          },
        },
      }),
    ).toBe('gpt-5-mini')
  })

  test('uses endpoint defaults from inference when no global default is set', () => {
    expect(
      getPersistedModelSettingFromSettings({
        inference: {
          version: 1,
          endpoints: [
            {
              id: 'gateway',
              name: 'Gateway',
              transport: 'direct',
              protocol: 'openai',
              authMode: 'api_key',
              defaultModelId: 'gpt-4.1-mini',
            },
          ],
        },
      }),
    ).toBe('gpt-4.1-mini')
  })

  test('ignores identity-only inference documents for model sync', () => {
    expect(
      getPersistedModelSettingFromSettings({
        inference: {
          version: 1,
          identity: {
            claude: {
              enabled: true,
            },
          },
        },
      }),
    ).toBeUndefined()
  })

  test('resolves aliases against matching model entries before falling back', () => {
    const route = resolveSelectedModelRoute({
      explicitModel: 'sonnet',
      settings: {
        inference: {
          version: 1,
          endpoints: [
            {
              id: 'custom-anthropic',
              name: 'Custom Anthropic',
              transport: 'direct',
              protocol: 'anthropic',
              authMode: 'api_key',
            },
          ],
          models: [
            {
              id: 'custom-sonnet',
              label: 'Custom Sonnet',
              endpointId: 'custom-anthropic',
              remoteModel: 'claude-sonnet-4-5-custom',
              aliases: ['sonnet'],
            },
          ],
        },
      },
    })

    expect(route.source).toBe('explicit')
    expect(route.exactMatch).toBe(true)
    expect(route.selectedEndpoint.id).toBe('custom-anthropic')
    expect(route.selectedModel.remoteModel).toBe('claude-sonnet-4-5-custom')
  })

  test('maps unmatched aliases using the selected endpoint provider defaults', () => {
    const route = resolveSelectedModelRoute({
      explicitModel: 'sonnet',
      settings: {
        inference: {
          version: 1,
          endpoints: [
            {
              id: 'openai-gateway',
              name: 'OpenAI Gateway',
              transport: 'direct',
              protocol: 'openai',
              authMode: 'api_key',
            },
          ],
        },
      },
    })

    expect(route.exactMatch).toBe(false)
    expect(route.selectedEndpoint.id).toBe('openai-gateway')
    expect(route.selectedModel.remoteModel).toBe(
      ALL_MODEL_CONFIGS.sonnet45.openaiCompatible,
    )
  })

  test('prefers base models over persisted defaults', () => {
    const route = resolveSelectedModelRoute({
      baseModel: 'opus',
      settings: {
        inference: {
          version: 1,
          endpoints: [
            {
              id: 'gateway',
              name: 'Gateway',
              transport: 'direct',
              protocol: 'openai',
              authMode: 'api_key',
              defaultModelId: 'gpt-5-mini',
            },
          ],
          defaults: {
            modelId: 'gpt-5-mini',
          },
        },
      },
    })

    expect(route.source).toBe('base')
    expect(route.selectedModel.remoteModel).toBe(
      ALL_MODEL_CONFIGS.opus46.openaiCompatible,
    )
  })

  test('matches configured legacy models case-insensitively for session overrides', () => {
    const route = resolveSelectedModelRoute({
      sessionModel: 'minimax-m2.7',
      settings: {
        api: {
          compatibility: 'openai',
          mode: 'custom',
          customName: 'MiniMax',
          baseUrl: 'https://api.minimax.chat/v1',
          model: 'MiniMax-M2.7',
        },
      },
    })

    expect(route.source).toBe('session')
    expect(route.exactMatch).toBe(true)
    expect(route.selectedEndpoint.name).toBe('MiniMax')
    expect(route.selectedModel.remoteModel).toBe('MiniMax-M2.7')
  })

  test('writes default-model patches to settings.model when no inference inventory exists', () => {
    expect(
      buildPersistedModelSettingsPatch(
        {
          model: 'opus',
        },
        'gpt-5-mini',
      ),
    ).toEqual({
      model: 'gpt-5-mini',
    })
  })

  test('clears incomplete inference stubs when persisting a legacy-backed model selection', () => {
    expect(
      buildPersistedModelSettingsPatch(
        {
          inference: {
            version: 1,
            defaults: {
              modelId: 'gpt-5-mini',
            },
          },
        },
        'gpt-5-mini',
      ),
    ).toEqual({
      inference: undefined,
      model: 'gpt-5-mini',
    })
  })

  test('writes default-model patches to settings.inference when inventory is configured there', () => {
    expect(
      buildPersistedModelSettingsPatch(
        {
          inference: {
            version: 1,
            endpoints: [
              {
                id: 'gateway',
                name: 'Gateway',
                transport: 'direct',
                protocol: 'openai',
                authMode: 'api_key',
              },
            ],
          },
          model: 'opus',
        },
        'gpt-5-mini',
      ),
    ).toEqual({
      inference: {
        version: 1,
        defaults: {
          modelId: 'gpt-5-mini',
        },
      },
      model: undefined,
    })
  })

  test('falls back to process env when no settings env is present', () => {
    try {
      process.env.CLAUDE_CODE_USE_OPENAI_COMPAT = '1'
      process.env.OPENAI_BASE_URL = 'https://gateway.example.com/v1'
      process.env.OPENAI_MODEL = 'gpt-4.1-mini'

      const route = resolveSelectedModelRoute({
        settings: {},
      })

      expect(route.source).toBe('legacyEnv')
      expect(route.selectedEndpoint.protocol).toBe('openai')
      expect(route.selectedEndpoint.baseUrl).toBe(
        'https://gateway.example.com/v1',
      )
      expect(route.selectedModel.remoteModel).toBe('gpt-4.1-mini')
    } finally {
      restoreAllEnv()
    }
  })
})
