import { describe, expect, test } from 'bun:test'
import {
  buildApiConfigEnvPatch,
  buildApiSettingsWritePatch,
  deriveApiSettingsFromLegacyEnv,
  getMainLoopModelSettingFromSettings,
  materializeApiConfigEnv,
} from './apiConfig.js'

describe('apiConfig', () => {
  test('derives a custom OpenAI-compatible config from legacy env', () => {
    const api = deriveApiSettingsFromLegacyEnv({
      CLAUDE_CODE_API_VENDOR_NAME: 'Internal Gateway',
      CLAUDE_CODE_USE_OPENAI_COMPAT: '1',
      OPENAI_API_KEY: 'sk-test',
      OPENAI_BASE_URL: 'https://gateway.example.com/v1',
      OPENAI_MODEL: 'gpt-4.1-mini',
    })

    expect(api).toEqual({
      apiKey: 'sk-test',
      baseUrl: 'https://gateway.example.com/v1',
      compatibility: 'openai',
      customName: 'Internal Gateway',
      mode: 'custom',
      model: 'gpt-4.1-mini',
    })
  })

  test('builds env for OpenAI-compatible config without Anthropic mirrors', () => {
    const env = buildApiConfigEnvPatch({
      apiKey: 'sk-test',
      baseUrl: 'https://gateway.example.com/v1',
      compatibility: 'openai',
      mode: 'custom',
      model: 'gpt-4.1-mini',
      openai: {
        apiKeyHeader: 'api-key',
      },
    })

    expect(env.CLAUDE_CODE_USE_OPENAI_COMPAT).toBe('1')
    expect(env.OPENAI_BASE_URL).toBe('https://gateway.example.com/v1')
    expect(env.OPENAI_MODEL).toBe('gpt-4.1-mini')
    expect(env.OPENAI_API_KEY).toBe('sk-test')
    expect(env.OPENAI_API_KEY_HEADER).toBe('api-key')
    expect(env.ANTHROPIC_BASE_URL).toBeUndefined()
    expect(env.ANTHROPIC_MODEL).toBeUndefined()
    expect(env.ANTHROPIC_API_KEY).toBeUndefined()
  })

  test('materializes preset defaults for Provider-compatible vendors', () => {
    const env = materializeApiConfigEnv({
      compatibility: 'anthropic',
      mode: 'preset',
      preset: 'minimax',
    })

    expect(env.ANTHROPIC_COMPAT_PRESET).toBe('minimax')
    expect(env.ANTHROPIC_BASE_URL).toBe('https://api.minimax.chat/v1')
    expect(env.ANTHROPIC_MODEL).toBe('MiniMax-M2.7')
    expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('MiniMax-M2.7')
    expect(env.ANTHROPIC_SMALL_FAST_MODEL).toBe('MiniMax-M2.7')
    expect(env.CLAUDE_CODE_USE_OPENAI_COMPAT).toBeUndefined()
  })

  test('cleans legacy api env keys while preserving unrelated env entries', () => {
    const patch = buildApiSettingsWritePatch(
      {
        compatibility: 'openai',
        mode: 'custom',
      },
      {
        FOO: 'bar',
        OPENAI_API_KEY: 'sk-test',
        OPENAI_BASE_URL: 'https://gateway.example.com/v1',
      },
    )

    expect(patch.api).toEqual({
      compatibility: 'openai',
      mode: 'custom',
    })
    expect(patch.env).toEqual({
      FOO: 'bar',
      OPENAI_API_KEY: undefined,
      OPENAI_BASE_URL: undefined,
    })
  })

  test('prefers the top-level saved model over legacy api defaults', () => {
    expect(
      getMainLoopModelSettingFromSettings({
        api: {
          apiKey: 'sk-test',
          baseUrl: 'https://gateway.example.com/v1',
          compatibility: 'openai',
          mode: 'custom',
          model: 'gpt-4.1-mini',
        },
        model: 'opus[1m]',
      }),
    ).toBe('opus[1m]')
  })

  test('uses preset provider defaults when settings.api omits an explicit model', () => {
    expect(
      getMainLoopModelSettingFromSettings({
        api: {
          compatibility: 'anthropic',
          mode: 'preset',
          preset: 'minimax',
        },
      }),
    ).toBe('MiniMax-M2.7')
  })

  test('prefers settings.inference defaults over legacy fields', () => {
    expect(
      getMainLoopModelSettingFromSettings({
        inference: {
          version: 1,
          defaults: {
            modelId: 'gpt-5-mini',
          },
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
      }),
    ).toBe('gpt-5-mini')
  })

  test('ignores identity-only inference documents for main model sync', () => {
    expect(
      getMainLoopModelSettingFromSettings({
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
})
