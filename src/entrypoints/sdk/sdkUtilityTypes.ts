export type UsageServiceTier = 'standard' | 'priority' | (string & {})

export type UsageCacheCreation = {
  ephemeral_1h_input_tokens?: number
  ephemeral_5m_input_tokens?: number
  [key: string]: number | undefined
}

export type UsageServerToolUse = {
  web_search_requests?: number
  web_fetch_requests?: number
  [key: string]: number | undefined
}

/**
 * Recovery copy of the normalized Anthropic usage payload used across the SDK
 * and CLI. The extracted snapshot only relies on a stable subset of fields, so
 * the type remains permissive for forward-compatible server additions.
 */
export type NonNullableUsage = {
  input_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  output_tokens: number
  server_tool_use: UsageServerToolUse
  service_tier?: UsageServiceTier
  cache_creation?: UsageCacheCreation
  inference_geo?: string
  iterations?: unknown[]
  speed?: string
  [key: string]: unknown
}
