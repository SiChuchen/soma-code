import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getSecureStorage } from '../secureStorage/index.js'
import { setEndpointApiKeyCredential } from './credentials.js'
import { resolveInferenceClientDescriptor } from './clientFactory.js'

function runWithTempConfigDir(fn: () => void): void {
  const configDir = mkdtempSync(join(tmpdir(), 'cc-inference-client-'))
  process.env.CLAUDE_CONFIG_DIR = configDir

  try {
    fn()
  } finally {
    getSecureStorage().delete()
    rmSync(configDir, { force: true, recursive: true })
    delete process.env.CLAUDE_CONFIG_DIR
  }
}

describe('resolveInferenceClientDescriptor', () => {
  test('resolves direct OpenAI-compatible runtime config from inference settings', () => {
    runWithTempConfigDir(() => {
      setEndpointApiKeyCredential('gateway', 'sk-endpoint')

      const descriptor = resolveInferenceClientDescriptor({
        settings: {
          inference: {
            version: 1,
            endpoints: [
              {
                id: 'gateway',
                name: 'Azure Gateway',
                transport: 'direct',
                protocol: 'openai',
                authMode: 'api_key',
                baseUrl:
                  'https://example.openai.azure.com/openai/deployments/test',
                metadata: {
                  apiFormat: 'responses',
                  disableAuth: 'true',
                  openaiProfile: 'azure',
                },
              },
            ],
            models: [
              {
                id: 'gpt-5-mini',
                label: 'GPT-5 mini',
                endpointId: 'gateway',
                remoteModel: 'gpt-5-mini',
              },
            ],
            defaults: {
              modelId: 'gpt-5-mini',
            },
          },
        },
      })

      expect(descriptor.provider).toBe('openaiCompatible')
      expect(descriptor.endpointApiKey).toBe('sk-endpoint')
      expect(descriptor.transportConfig).toMatchObject({
        kind: 'direct',
        baseUrl: 'https://example.openai.azure.com/openai/deployments/test',
        isFirstPartyAnthropicBaseUrl: false,
      })
      expect(descriptor.openAICompat).toMatchObject({
        apiFormat: 'responses',
        apiKey: 'sk-endpoint',
        apiKeyHeaderName: 'api-key',
        apiKeyScheme: '',
        baseUrl: 'https://example.openai.azure.com/openai/deployments/test',
        disableAuth: true,
        model: 'gpt-5-mini',
        profile: 'azure',
      })
    })
  })

  test('resolves bedrock transport metadata from inference settings', () => {
    const descriptor = resolveInferenceClientDescriptor({
      settings: {
        inference: {
          version: 1,
          endpoints: [
            {
              id: 'bedrock-main',
              name: 'Bedrock',
              transport: 'bedrock',
              protocol: 'anthropic',
              authMode: 'aws',
              baseUrl: 'https://bedrock.example.com',
              metadata: {
                awsRegion: 'us-west-2',
                skipAuth: 'true',
              },
            },
          ],
          models: [
            {
              id: 'claude-sonnet-4-5',
              label: 'Claude Sonnet 4.5',
              endpointId: 'bedrock-main',
              remoteModel: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
            },
          ],
        },
      },
    })

    expect(descriptor.provider).toBe('bedrock')
    expect(descriptor.transportConfig).toEqual({
      kind: 'bedrock',
      awsRegion: 'us-west-2',
      baseUrl: 'https://bedrock.example.com',
      skipAuth: true,
    })
  })

  test('resolves vertex transport metadata from inference settings', () => {
    const descriptor = resolveInferenceClientDescriptor({
      settings: {
        inference: {
          version: 1,
          endpoints: [
            {
              id: 'vertex-main',
              name: 'Vertex',
              transport: 'vertex',
              protocol: 'anthropic',
              authMode: 'gcp',
              metadata: {
                projectId: 'demo-project',
                region: 'europe-west4',
              },
            },
          ],
          models: [
            {
              id: 'claude-sonnet-4-5',
              label: 'Claude Sonnet 4.5',
              endpointId: 'vertex-main',
              remoteModel: 'claude-sonnet-4-5',
            },
          ],
        },
      },
    })

    expect(descriptor.provider).toBe('vertex')
    expect(descriptor.transportConfig).toEqual({
      kind: 'vertex',
      baseUrl: undefined,
      projectId: 'demo-project',
      region: 'europe-west4',
      skipAuth: false,
    })
  })

  test('resolves foundry transport metadata from inference settings', () => {
    const descriptor = resolveInferenceClientDescriptor({
      settings: {
        inference: {
          version: 1,
          endpoints: [
            {
              id: 'foundry-main',
              name: 'Foundry',
              transport: 'foundry',
              protocol: 'anthropic',
              authMode: 'azure_ad',
              metadata: {
                resource: 'resource-name',
                skipAuth: 'true',
              },
            },
          ],
          models: [
            {
              id: 'claude-sonnet-4-5',
              label: 'Claude Sonnet 4.5',
              endpointId: 'foundry-main',
              remoteModel: 'claude-sonnet-4-5',
            },
          ],
        },
      },
    })

    expect(descriptor.provider).toBe('foundry')
    expect(descriptor.transportConfig).toEqual({
      kind: 'foundry',
      baseUrl: undefined,
      resource: 'resource-name',
      skipAuth: true,
    })
  })
})
