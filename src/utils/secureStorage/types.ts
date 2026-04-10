import type {
  OAuthProfileResponse,
  RateLimitTier,
  SubscriptionType,
} from '../../services/oauth/types.js'

export type ClaudeAiOauthData = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  scopes: string[]
  subscriptionType: SubscriptionType | null
  rateLimitTier: RateLimitTier | null
  profile?: OAuthProfileResponse
}

export type McpOAuthDiscoveryState = {
  authorizationServerUrl?: string
  resourceMetadataUrl?: string
}

export type McpOAuthStoredData = {
  serverName: string
  serverUrl: string
  accessToken: string
  expiresAt: number
  refreshToken?: string
  scope?: string
  clientId?: string
  clientSecret?: string
  stepUpScope?: string
  discoveryState?: McpOAuthDiscoveryState
}

export type McpOAuthClientConfig = {
  clientSecret?: string
}

export type XaaIdpTokenData = {
  idToken: string
  expiresAt: number
}

export type XaaIdpClientConfig = {
  clientSecret?: string
}

export type EndpointApiKeyCredentialSource =
  | 'console_oauth'
  | 'manual'
  | 'legacy'

export type EndpointApiKeyCredential = {
  type: 'api_key'
  apiKey: string
  updatedAt: number
  source?: EndpointApiKeyCredentialSource
}

export type InferenceCredentialsData = {
  endpoints?: Record<string, EndpointApiKeyCredential>
}

export type ChatGptOAuthData = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  accountId: string | null
  idToken?: string | null
}

export type SecureStorageData = {
  claudeAiOauth?: ClaudeAiOauthData
  chatgptOauth?: ChatGptOAuthData
  inferenceCredentials?: InferenceCredentialsData
  mcpOAuth?: Record<string, McpOAuthStoredData>
  mcpOAuthClientConfig?: Record<string, McpOAuthClientConfig>
  mcpXaaIdp?: Record<string, XaaIdpTokenData>
  mcpXaaIdpConfig?: Record<string, XaaIdpClientConfig>
  pluginSecrets?: Record<string, Record<string, string>>
  trustedDeviceToken?: string
  [key: string]: unknown
}

export type SecureStorage = {
  name: string
  read(): SecureStorageData | null
  readAsync(): Promise<SecureStorageData | null>
  update(data: SecureStorageData): { success: boolean; warning?: string }
  delete(): boolean
}
