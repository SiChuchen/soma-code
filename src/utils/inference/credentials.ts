import { getSecureStorage } from '../secureStorage/index.js'
import type {
  ClaudeAiOauthData,
  EndpointApiKeyCredential,
  EndpointApiKeyCredentialSource,
  SecureStorageData,
} from '../secureStorage/types.js'

export const CLAUDE_OFFICIAL_ENDPOINT_ID = 'claude-official'

type CredentialUpdateResult = {
  success: boolean
  warning?: string
}

function normalizeEndpointId(endpointId: string): string {
  const trimmed = endpointId.trim()
  if (!trimmed) {
    throw new Error('endpointId is required')
  }
  return trimmed
}

function updateSecureStorage(
  updater: (data: SecureStorageData) => void,
): CredentialUpdateResult {
  const secureStorage = getSecureStorage()
  const data = secureStorage.read() ?? {}
  updater(data)
  return secureStorage.update(data)
}

export function getClaudeIdentityCredential(): ClaudeAiOauthData | null {
  return getSecureStorage().read()?.claudeAiOauth ?? null
}

export async function getClaudeIdentityCredentialAsync(): Promise<ClaudeAiOauthData | null> {
  return (await getSecureStorage().readAsync())?.claudeAiOauth ?? null
}

export function setClaudeIdentityCredential(
  credential: ClaudeAiOauthData,
): CredentialUpdateResult {
  return updateSecureStorage(data => {
    data.claudeAiOauth = credential
  })
}

export function deleteClaudeIdentityCredential(): CredentialUpdateResult {
  return updateSecureStorage(data => {
    delete data.claudeAiOauth
  })
}

export function getEndpointCredential(
  endpointId: string,
): EndpointApiKeyCredential | null {
  const normalizedEndpointId = normalizeEndpointId(endpointId)
  return (
    getSecureStorage().read()?.inferenceCredentials?.endpoints?.[
      normalizedEndpointId
    ] ?? null
  )
}

export function setEndpointCredential(
  endpointId: string,
  credential: EndpointApiKeyCredential,
): CredentialUpdateResult {
  const normalizedEndpointId = normalizeEndpointId(endpointId)

  return updateSecureStorage(data => {
    data.inferenceCredentials = {
      ...(data.inferenceCredentials ?? {}),
      endpoints: {
        ...(data.inferenceCredentials?.endpoints ?? {}),
        [normalizedEndpointId]: credential,
      },
    }
  })
}

export function setEndpointApiKeyCredential(
  endpointId: string,
  apiKey: string,
  options: {
    source?: EndpointApiKeyCredentialSource
  } = {},
): CredentialUpdateResult {
  return setEndpointCredential(endpointId, {
    type: 'api_key',
    apiKey,
    updatedAt: Date.now(),
    ...(options.source ? { source: options.source } : {}),
  })
}

export function deleteEndpointCredential(
  endpointId: string,
): CredentialUpdateResult {
  const normalizedEndpointId = normalizeEndpointId(endpointId)

  return updateSecureStorage(data => {
    const endpoints = {
      ...(data.inferenceCredentials?.endpoints ?? {}),
    }

    delete endpoints[normalizedEndpointId]

    if (Object.keys(endpoints).length === 0) {
      delete data.inferenceCredentials
      return
    }

    data.inferenceCredentials = {
      ...(data.inferenceCredentials ?? {}),
      endpoints,
    }
  })
}

export function clearAllInferenceCredentials(): CredentialUpdateResult {
  return updateSecureStorage(data => {
    delete data.claudeAiOauth
    delete data.inferenceCredentials
  })
}
