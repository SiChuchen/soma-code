import type {
  ApiSettings,
  InferenceSettings,
} from '../settings/types.js'

export type InferenceConfigSource =
  | 'default'
  | 'legacyEnv'
  | 'settingsApi'
  | 'settingsModel'
  | 'inference'

export type InferenceAccountMode = 'claudeai' | 'console'
export type InferenceEndpointKind = 'official_claude' | 'custom'
export type InferenceTransport = 'direct' | 'bedrock' | 'vertex' | 'foundry'
export type InferenceProtocol = 'anthropic' | 'openai'
export type InferenceAuthMode =
  | 'claude_oauth'
  | 'api_key'
  | 'aws'
  | 'gcp'
  | 'azure_ad'
  | 'azure_api_key'
  | 'chatgpt_oauth'

export type ResolveInferenceConfigOptions = {
  inference?: InferenceSettings | null
  legacyEnv?: Record<string, string | undefined>
  selectedModelId?: string | null
  settingsApi?: ApiSettings | null
  settingsModel?: string | null
}

export type ResolvedClaudeIdentity = {
  enabled: boolean
  accountMode?: InferenceAccountMode
  forceOrgUuid?: string
}

export type ResolvedEndpoint = {
  id: string
  name: string
  kind: InferenceEndpointKind
  transport: InferenceTransport
  protocol: InferenceProtocol
  authMode: InferenceAuthMode
  enabled: boolean
  baseUrl?: string
  credentialRef?: string
  defaultModelId?: string
  metadata: Record<string, string>
}

export type ResolvedModelEntry = {
  id: string
  label: string
  endpointId: string
  remoteModel: string
  aliases: string[]
  enabled: boolean
  isDefaultCandidate: boolean
  capabilityProfile?: string
  billingProfile?: string
}

export type ResolvedInferenceSettings = {
  version: 1
  identity?: {
    claude?: ResolvedClaudeIdentity
  }
  endpoints: ResolvedEndpoint[]
  models: ResolvedModelEntry[]
  defaults?: {
    modelId?: string
  }
}

export type ResolvedInferenceConfig = {
  source: InferenceConfigSource
  config: ResolvedInferenceSettings
  identity: ResolvedClaudeIdentity | null
  endpoints: ResolvedEndpoint[]
  models: ResolvedModelEntry[]
  defaultModelId: string | null
  selectedModelId: string
  selectedModel: ResolvedModelEntry
  selectedEndpoint: ResolvedEndpoint
}
