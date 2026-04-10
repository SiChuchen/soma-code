import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getSecureStorage } from '../secureStorage/index.js'
import {
  clearAllInferenceCredentials,
  deleteClaudeIdentityCredential,
  deleteEndpointCredential,
  getClaudeIdentityCredential,
  getEndpointCredential,
  setClaudeIdentityCredential,
  setEndpointApiKeyCredential,
} from './credentials.js'

function createDummyOauthCredential() {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: Date.now() + 60_000,
    scopes: ['user:inference'],
    subscriptionType: null,
    rateLimitTier: null,
  }
}

describe('inference credential store', () => {
  function runWithTempConfigDir(fn: () => void): void {
    const configDir = mkdtempSync(join(tmpdir(), 'cc-inference-creds-'))
    process.env.CLAUDE_CONFIG_DIR = configDir

    try {
      fn()
    } finally {
      getSecureStorage().delete()
      rmSync(configDir, { force: true, recursive: true })
      delete process.env.CLAUDE_CONFIG_DIR
    }
  }

  test('deleting Claude identity keeps endpoint credentials intact', () => {
    runWithTempConfigDir(() => {
      setClaudeIdentityCredential(createDummyOauthCredential())
      setEndpointApiKeyCredential('openai-main', 'sk-test')

      deleteClaudeIdentityCredential()

      expect(getClaudeIdentityCredential()).toBeNull()
      expect(getEndpointCredential('openai-main')).toMatchObject({
        apiKey: 'sk-test',
        type: 'api_key',
      })
    })
  })

  test('deleting an endpoint credential keeps Claude identity intact', () => {
    runWithTempConfigDir(() => {
      setClaudeIdentityCredential(createDummyOauthCredential())
      setEndpointApiKeyCredential('openai-main', 'sk-test')

      deleteEndpointCredential('openai-main')

      expect(getClaudeIdentityCredential()).toMatchObject({
        accessToken: 'access-token',
      })
      expect(getEndpointCredential('openai-main')).toBeNull()
    })
  })

  test('clearing inference credentials preserves unrelated secure storage data', () => {
    runWithTempConfigDir(() => {
      setClaudeIdentityCredential(createDummyOauthCredential())
      setEndpointApiKeyCredential('openai-main', 'sk-test')

      const secureStorage = getSecureStorage()
      secureStorage.update({
        ...(secureStorage.read() ?? {}),
        pluginSecrets: {
          demo: {
            token: 'secret',
          },
        },
      })

      clearAllInferenceCredentials()

      const storageData = secureStorage.read()
      expect(storageData?.claudeAiOauth).toBeUndefined()
      expect(storageData?.inferenceCredentials).toBeUndefined()
      expect(storageData?.pluginSecrets).toEqual({
        demo: {
          token: 'secret',
        },
      })
    })
  })
})
