import type { z } from 'zod/v4'
import {
  ControlErrorResponseSchema,
  ControlResponseSchema,
  SDKControlCancelAsyncMessageRequestSchema,
  SDKControlCancelAsyncMessageResponseSchema,
  SDKControlCancelRequestSchema,
  SDKControlChannelEnableRequestSchema,
  SDKControlClaudeAuthenticateRequestSchema,
  SDKControlClaudeOAuthCallbackRequestSchema,
  SDKControlClaudeOAuthWaitForCompletionRequestSchema,
  SDKControlElicitationRequestSchema,
  SDKControlElicitationResponseSchema,
  SDKControlEndSessionRequestSchema,
  SDKControlGenerateSessionTitleRequestSchema,
  SDKControlGetContextUsageRequestSchema,
  SDKControlGetContextUsageResponseSchema,
  SDKControlGetSettingsRequestSchema,
  SDKControlGetSettingsResponseSchema,
  SDKControlInitializeRequestSchema,
  SDKControlInitializeResponseSchema,
  SDKControlInterruptRequestSchema,
  SDKControlMcpMessageRequestSchema,
  SDKControlMcpAuthenticateRequestSchema,
  SDKControlMcpClearAuthRequestSchema,
  SDKControlMcpOAuthCallbackUrlRequestSchema,
  SDKControlMcpReconnectRequestSchema,
  SDKControlMcpSetServersRequestSchema,
  SDKControlMcpSetServersResponseSchema,
  SDKControlMcpStatusRequestSchema,
  SDKControlMcpStatusResponseSchema,
  SDKControlMcpToggleRequestSchema,
  SDKControlPermissionRequestSchema,
  SDKControlReloadPluginsRequestSchema,
  SDKControlReloadPluginsResponseSchema,
  SDKControlRequestInnerSchema,
  SDKControlRequestSchema,
  SDKControlResponseSchema,
  SDKControlRewindFilesRequestSchema,
  SDKControlRewindFilesResponseSchema,
  SDKControlSeedReadStateRequestSchema,
  SDKControlRemoteControlRequestSchema,
  SDKControlSetMaxThinkingTokensRequestSchema,
  SDKControlSetModelRequestSchema,
  SDKControlSetPermissionModeRequestSchema,
  SDKControlSideQuestionRequestSchema,
  SDKControlStopTaskRequestSchema,
  SDKHookCallbackMatcherSchema,
  SDKKeepAliveMessageSchema,
  SDKUpdateEnvironmentVariablesMessageSchema,
  StdinMessageSchema,
  StdoutMessageSchema,
  SDKControlApplyFlagSettingsRequestSchema,
} from './controlSchemas.js'
import type {
  SDKMessage,
  SDKPartialAssistantMessage,
  SDKPostTurnSummaryMessage,
  SDKUserMessage,
} from './coreTypes.generated.js'

type InferSchema<T extends (...args: never[]) => z.ZodTypeAny> = z.infer<
  ReturnType<T>
>

export type SDKHookCallbackMatcher = InferSchema<
  typeof SDKHookCallbackMatcherSchema
>
export type SDKControlInitializeRequest = InferSchema<
  typeof SDKControlInitializeRequestSchema
>
export type SDKControlInitializeResponse = InferSchema<
  typeof SDKControlInitializeResponseSchema
>
export type SDKControlInterruptRequest = InferSchema<
  typeof SDKControlInterruptRequestSchema
>
export type SDKControlEndSessionRequest = InferSchema<
  typeof SDKControlEndSessionRequestSchema
>
export type SDKControlPermissionRequest = InferSchema<
  typeof SDKControlPermissionRequestSchema
>
export type SDKControlSetPermissionModeRequest = InferSchema<
  typeof SDKControlSetPermissionModeRequestSchema
>
export type SDKControlSetModelRequest = InferSchema<
  typeof SDKControlSetModelRequestSchema
>
export type SDKControlSetMaxThinkingTokensRequest = InferSchema<
  typeof SDKControlSetMaxThinkingTokensRequestSchema
>
export type SDKControlMcpStatusRequest = InferSchema<
  typeof SDKControlMcpStatusRequestSchema
>
export type SDKControlMcpStatusResponse = InferSchema<
  typeof SDKControlMcpStatusResponseSchema
>
export type SDKControlGetContextUsageRequest = InferSchema<
  typeof SDKControlGetContextUsageRequestSchema
>
export type SDKControlGetContextUsageResponse = InferSchema<
  typeof SDKControlGetContextUsageResponseSchema
>
export type SDKControlRewindFilesRequest = InferSchema<
  typeof SDKControlRewindFilesRequestSchema
>
export type SDKControlRewindFilesResponse = InferSchema<
  typeof SDKControlRewindFilesResponseSchema
>
export type SDKControlCancelAsyncMessageRequest = InferSchema<
  typeof SDKControlCancelAsyncMessageRequestSchema
>
export type SDKControlCancelAsyncMessageResponse = InferSchema<
  typeof SDKControlCancelAsyncMessageResponseSchema
>
export type SDKControlSeedReadStateRequest = InferSchema<
  typeof SDKControlSeedReadStateRequestSchema
>
export type SDKControlMcpMessageRequest = InferSchema<
  typeof SDKControlMcpMessageRequestSchema
>
export type SDKControlMcpAuthenticateRequest = InferSchema<
  typeof SDKControlMcpAuthenticateRequestSchema
>
export type SDKControlMcpOAuthCallbackUrlRequest = InferSchema<
  typeof SDKControlMcpOAuthCallbackUrlRequestSchema
>
export type SDKControlMcpSetServersRequest = InferSchema<
  typeof SDKControlMcpSetServersRequestSchema
>
export type SDKControlMcpSetServersResponse = InferSchema<
  typeof SDKControlMcpSetServersResponseSchema
>
export type SDKControlReloadPluginsRequest = InferSchema<
  typeof SDKControlReloadPluginsRequestSchema
>
export type SDKControlReloadPluginsResponse = InferSchema<
  typeof SDKControlReloadPluginsResponseSchema
>
export type SDKControlMcpReconnectRequest = InferSchema<
  typeof SDKControlMcpReconnectRequestSchema
>
export type SDKControlMcpToggleRequest = InferSchema<
  typeof SDKControlMcpToggleRequestSchema
>
export type SDKControlChannelEnableRequest = InferSchema<
  typeof SDKControlChannelEnableRequestSchema
>
export type SDKControlMcpClearAuthRequest = InferSchema<
  typeof SDKControlMcpClearAuthRequestSchema
>
export type SDKControlStopTaskRequest = InferSchema<
  typeof SDKControlStopTaskRequestSchema
>
export type SDKControlApplyFlagSettingsRequest = InferSchema<
  typeof SDKControlApplyFlagSettingsRequestSchema
>
export type SDKControlGetSettingsRequest = InferSchema<
  typeof SDKControlGetSettingsRequestSchema
>
export type SDKControlGetSettingsResponse = InferSchema<
  typeof SDKControlGetSettingsResponseSchema
>
export type SDKControlElicitationRequest = InferSchema<
  typeof SDKControlElicitationRequestSchema
>
export type SDKControlElicitationResponse = InferSchema<
  typeof SDKControlElicitationResponseSchema
>
export type SDKControlClaudeAuthenticateRequest = InferSchema<
  typeof SDKControlClaudeAuthenticateRequestSchema
>
export type SDKControlClaudeOAuthCallbackRequest = InferSchema<
  typeof SDKControlClaudeOAuthCallbackRequestSchema
>
export type SDKControlClaudeOAuthWaitForCompletionRequest = InferSchema<
  typeof SDKControlClaudeOAuthWaitForCompletionRequestSchema
>
export type SDKControlGenerateSessionTitleRequest = InferSchema<
  typeof SDKControlGenerateSessionTitleRequestSchema
>
export type SDKControlSideQuestionRequest = InferSchema<
  typeof SDKControlSideQuestionRequestSchema
>
export type SDKControlRemoteControlRequest = InferSchema<
  typeof SDKControlRemoteControlRequestSchema
>
export type SDKControlRequestInner = InferSchema<
  typeof SDKControlRequestInnerSchema
>
export type SDKControlRequest = InferSchema<typeof SDKControlRequestSchema>
export type SDKControlResponseSuccess = InferSchema<typeof ControlResponseSchema>
export type SDKControlResponseError = InferSchema<
  typeof ControlErrorResponseSchema
>
export type SDKControlResponse = InferSchema<typeof SDKControlResponseSchema>
export type SDKControlCancelRequest = InferSchema<
  typeof SDKControlCancelRequestSchema
>
export type SDKKeepAliveMessage = InferSchema<typeof SDKKeepAliveMessageSchema>
export type SDKUpdateEnvironmentVariablesMessage = InferSchema<
  typeof SDKUpdateEnvironmentVariablesMessageSchema
>
export type StdoutMessage =
  | SDKMessage
  | SDKPostTurnSummaryMessage
  | SDKControlResponse
  | SDKControlRequest
  | SDKControlCancelRequest
  | SDKKeepAliveMessage
export type StdinMessage =
  | SDKUserMessage
  | SDKControlRequest
  | SDKControlResponse
  | SDKKeepAliveMessage
  | SDKUpdateEnvironmentVariablesMessage
export type { SDKPartialAssistantMessage }
