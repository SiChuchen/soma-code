import { describe, expect, test } from 'bun:test'
import {
  getOpenAICompatApiKey,
  getOpenAICompatBaseUrl,
  getOpenAICompatProtocol,
} from './openaiCompat.js'

const ORIGINAL_ENV = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_COMPAT_API_FORMAT: process.env.OPENAI_COMPAT_API_FORMAT,
  OPENAI_COMPAT_DISABLE_AUTH: process.env.OPENAI_COMPAT_DISABLE_AUTH,
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
  restoreEnv('OPENAI_API_KEY', ORIGINAL_ENV.OPENAI_API_KEY)
  restoreEnv('OPENAI_BASE_URL', ORIGINAL_ENV.OPENAI_BASE_URL)
  restoreEnv('OPENAI_COMPAT_API_FORMAT', ORIGINAL_ENV.OPENAI_COMPAT_API_FORMAT)
  restoreEnv(
    'OPENAI_COMPAT_DISABLE_AUTH',
    ORIGINAL_ENV.OPENAI_COMPAT_DISABLE_AUTH,
  )
}

describe('openAI compat runtime overrides', () => {
  test('prefers runtime config over environment defaults', () => {
    try {
      process.env.OPENAI_API_KEY = 'sk-env'
      process.env.OPENAI_BASE_URL = 'https://env.example.com/v1'
      process.env.OPENAI_COMPAT_API_FORMAT = 'chat_completions'

      expect(
        getOpenAICompatBaseUrl({
          baseUrl: 'https://runtime.example.com/v1',
        }),
      ).toBe('https://runtime.example.com/v1')
      expect(
        getOpenAICompatProtocol({
          apiFormat: 'responses',
        }),
      ).toBe('responses')
      expect(
        getOpenAICompatApiKey({
          apiKey: 'sk-runtime',
        }),
      ).toBe('sk-runtime')
    } finally {
      restoreAllEnv()
    }
  })

  test('respects runtime auth disabling even when env has an api key', () => {
    try {
      process.env.OPENAI_API_KEY = 'sk-env'
      process.env.OPENAI_COMPAT_DISABLE_AUTH = '0'

      expect(
        getOpenAICompatApiKey({
          apiKey: 'sk-runtime',
          disableAuth: true,
        }),
      ).toBeUndefined()
    } finally {
      restoreAllEnv()
    }
  })
})
