import type {
  BetaMessage,
  BetaMessageParam,
  BetaRawMessageStreamEvent,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { z } from 'zod/v4'
import {
  AccountInfoSchema,
  AgentDefinitionSchema,
  AgentInfoSchema,
  ApiKeySourceSchema,
  FastModeStateSchema,
  HookEventSchema,
  HookInputSchema,
  HookJSONOutputSchema,
  McpServerConfigForProcessTransportSchema,
  McpServerStatusSchema,
  ModelInfoSchema,
  ModelUsageSchema,
  OutputFormatSchema,
  PermissionModeSchema,
  PermissionResultSchema,
  PermissionUpdateSchema,
  RewindFilesResultSchema,
  SDKAPIRetryMessageSchema,
  SDKAssistantMessageErrorSchema,
  SDKAuthStatusMessageSchema,
  SDKCompactBoundaryMessageSchema,
  SDKElicitationCompleteMessageSchema,
  SDKFilesPersistedEventSchema,
  SDKHookProgressMessageSchema,
  SDKHookResponseMessageSchema,
  SDKHookStartedMessageSchema,
  SDKLocalCommandOutputMessageSchema,
  SDKPermissionDenialSchema,
  SDKPostTurnSummaryMessageSchema,
  SDKPromptSuggestionMessageSchema,
  SDKRateLimitEventSchema,
  SDKRateLimitInfoSchema,
  SDKSessionInfoSchema,
  SDKSessionStateChangedMessageSchema,
  SDKStatusMessageSchema,
  SDKSystemMessageSchema,
  SDKTaskNotificationMessageSchema,
  SDKTaskProgressMessageSchema,
  SDKTaskStartedMessageSchema,
  SDKToolProgressMessageSchema,
  SDKToolUseSummaryMessageSchema,
  SdkPluginConfigSchema,
  SettingSourceSchema,
  SlashCommandSchema,
  ThinkingConfigSchema,
} from './coreSchemas.js'
import type { NonNullableUsage } from './sdkUtilityTypes.js'

type InferSchema<T extends (...args: never[]) => z.ZodTypeAny> = z.infer<
  ReturnType<T>
>

export type ModelUsage = InferSchema<typeof ModelUsageSchema>
export type OutputFormat = InferSchema<typeof OutputFormatSchema>
export type ApiKeySource = InferSchema<typeof ApiKeySourceSchema>
export type ThinkingConfig = InferSchema<typeof ThinkingConfigSchema>
export type McpServerConfigForProcessTransport = InferSchema<
  typeof McpServerConfigForProcessTransportSchema
>
export type McpServerStatus = InferSchema<typeof McpServerStatusSchema>
export type PermissionUpdate = InferSchema<typeof PermissionUpdateSchema>
export type PermissionResult = InferSchema<typeof PermissionResultSchema>
export type PermissionMode = InferSchema<typeof PermissionModeSchema>
export type HookEvent = InferSchema<typeof HookEventSchema>
export type HookInput = InferSchema<typeof HookInputSchema>
export type HookJSONOutput = InferSchema<typeof HookJSONOutputSchema>
export type SlashCommand = InferSchema<typeof SlashCommandSchema>
export type AgentInfo = InferSchema<typeof AgentInfoSchema>
export type ModelInfo = InferSchema<typeof ModelInfoSchema>
export type AccountInfo = InferSchema<typeof AccountInfoSchema>
export type AgentDefinition = InferSchema<typeof AgentDefinitionSchema>
export type SettingSource = InferSchema<typeof SettingSourceSchema>
export type SdkPluginConfig = InferSchema<typeof SdkPluginConfigSchema>
export type RewindFilesResult = InferSchema<typeof RewindFilesResultSchema>
export type SDKAssistantMessageError = InferSchema<
  typeof SDKAssistantMessageErrorSchema
>
export type SDKStatus = 'compacting' | null
export type SDKRateLimitInfo = InferSchema<typeof SDKRateLimitInfoSchema>
export type SDKPermissionDenial = InferSchema<typeof SDKPermissionDenialSchema>
export type FastModeState = InferSchema<typeof FastModeStateSchema>

export type SDKUserMessage = {
  type: 'user'
  message: BetaMessageParam
  parent_tool_use_id: string | null
  isSynthetic?: boolean
  tool_use_result?: unknown
  priority?: 'now' | 'next' | 'later'
  timestamp?: string
  uuid?: string
  session_id?: string
}

export type SDKUserMessageReplay = Omit<SDKUserMessage, 'uuid' | 'session_id'> & {
  uuid: string
  session_id: string
  isReplay: true
}

export type SDKAssistantMessage = {
  type: 'assistant'
  message: BetaMessage
  parent_tool_use_id: string | null
  error?: SDKAssistantMessageError
  uuid: string
  session_id: string
}

export type SDKRateLimitEvent = InferSchema<typeof SDKRateLimitEventSchema>
export type SDKResultSuccess = {
  type: 'result'
  subtype: 'success'
  duration_ms: number
  duration_api_ms: number
  is_error: boolean
  num_turns: number
  result: string
  stop_reason: string | null
  total_cost_usd: number
  usage: NonNullableUsage
  modelUsage: Record<string, ModelUsage>
  permission_denials: SDKPermissionDenial[]
  structured_output?: unknown
  fast_mode_state?: FastModeState
  uuid: string
  session_id: string
}

export type SDKResultError = {
  type: 'result'
  subtype:
    | 'error_during_execution'
    | 'error_max_turns'
    | 'error_max_budget_usd'
    | 'error_max_structured_output_retries'
  duration_ms: number
  duration_api_ms: number
  is_error: boolean
  num_turns: number
  stop_reason: string | null
  total_cost_usd: number
  usage: NonNullableUsage
  modelUsage: Record<string, ModelUsage>
  permission_denials: SDKPermissionDenial[]
  errors: string[]
  fast_mode_state?: FastModeState
  uuid: string
  session_id: string
}

export type SDKResultMessage = SDKResultSuccess | SDKResultError
export type SDKSystemMessage = InferSchema<typeof SDKSystemMessageSchema>

export type SDKPartialAssistantMessage = {
  type: 'stream_event'
  event: BetaRawMessageStreamEvent
  parent_tool_use_id: string | null
  uuid: string
  session_id: string
}

export type SDKCompactBoundaryMessage = InferSchema<
  typeof SDKCompactBoundaryMessageSchema
>
export type SDKStatusMessage = InferSchema<typeof SDKStatusMessageSchema>
export type SDKPostTurnSummaryMessage = InferSchema<
  typeof SDKPostTurnSummaryMessageSchema
>
export type SDKAPIRetryMessage = InferSchema<typeof SDKAPIRetryMessageSchema>
export type SDKLocalCommandOutputMessage = InferSchema<
  typeof SDKLocalCommandOutputMessageSchema
>
export type SDKHookStartedMessage = InferSchema<
  typeof SDKHookStartedMessageSchema
>
export type SDKHookProgressMessage = InferSchema<
  typeof SDKHookProgressMessageSchema
>
export type SDKHookResponseMessage = InferSchema<
  typeof SDKHookResponseMessageSchema
>
export type SDKToolProgressMessage = InferSchema<
  typeof SDKToolProgressMessageSchema
>
export type SDKAuthStatusMessage = InferSchema<typeof SDKAuthStatusMessageSchema>
export type SDKFilesPersistedEvent = InferSchema<
  typeof SDKFilesPersistedEventSchema
>
export type SDKTaskNotificationMessage = InferSchema<
  typeof SDKTaskNotificationMessageSchema
>
export type SDKTaskStartedMessage = InferSchema<
  typeof SDKTaskStartedMessageSchema
>
export type SDKSessionStateChangedMessage = InferSchema<
  typeof SDKSessionStateChangedMessageSchema
>
export type SDKTaskProgressMessage = InferSchema<
  typeof SDKTaskProgressMessageSchema
>
export type SDKToolUseSummaryMessage = InferSchema<
  typeof SDKToolUseSummaryMessageSchema
>
export type SDKElicitationCompleteMessage = InferSchema<
  typeof SDKElicitationCompleteMessageSchema
>
export type SDKPromptSuggestionMessage = InferSchema<
  typeof SDKPromptSuggestionMessageSchema
>
export type SDKSessionInfo = InferSchema<typeof SDKSessionInfoSchema>

export type SDKMessage =
  | SDKAssistantMessage
  | SDKUserMessage
  | SDKUserMessageReplay
  | SDKResultMessage
  | SDKSystemMessage
  | SDKPartialAssistantMessage
  | SDKCompactBoundaryMessage
  | SDKStatusMessage
  | SDKAPIRetryMessage
  | SDKLocalCommandOutputMessage
  | SDKHookStartedMessage
  | SDKHookProgressMessage
  | SDKHookResponseMessage
  | SDKToolProgressMessage
  | SDKAuthStatusMessage
  | SDKTaskNotificationMessage
  | SDKTaskStartedMessage
  | SDKTaskProgressMessage
  | SDKSessionStateChangedMessage
  | SDKFilesPersistedEvent
  | SDKToolUseSummaryMessage
  | SDKRateLimitEvent
  | SDKElicitationCompleteMessage
  | SDKPromptSuggestionMessage
