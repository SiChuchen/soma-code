import type { APIError } from '@anthropic-ai/sdk'
import type {
  BetaContentBlock,
  BetaMessage,
  BetaRawMessageStreamEvent,
  BetaToolUseBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import type { UUID } from 'crypto'
import type { SDKAssistantMessageError } from '../entrypoints/agentSdkTypes.js'
import type { PermissionMode } from './permissions.js'

type MessageUUID = UUID | string

type BaseMessage = {
  uuid: MessageUUID
  timestamp: string
}

type UserPayload<T extends ContentBlockParam = ContentBlockParam> = {
  role: 'user'
  content: string | T[]
  [key: string]: unknown
}

type AssistantPayload<T extends BetaContentBlock = BetaContentBlock> = Omit<
  BetaMessage,
  'content'
> & {
  content: T[]
}

type AttachmentLike = {
  type: string
  [key: string]: unknown
}

export type MessageOrigin =
  | { kind: 'human' }
  | { kind: 'task-notification' }
  | { kind: 'coordinator' }
  | { kind: 'channel'; server: string }

export type PartialCompactDirection = 'from' | 'up_to'

export type StopHookInfo = {
  command: string
  promptText?: string
  durationMs?: number
}

export type CompactMetadata = {
  trigger: 'manual' | 'auto' | (string & {})
  preTokens: number
  userContext?: string
  messagesSummarized?: number
  preservedSegment?: {
    headUuid: MessageUUID
    anchorUuid: MessageUUID
    tailUuid: MessageUUID
  }
  preCompactDiscoveredTools?: string[]
}

export type MicrocompactMetadata = {
  trigger: 'auto' | (string & {})
  preTokens: number
  tokensSaved: number
  compactedToolIds: string[]
  clearedAttachmentUUIDs: string[]
}

export type SnipBoundaryMetadata = {
  trigger: 'auto' | 'manual' | 'force' | (string & {})
  tokensFreed?: number
  removedMessages?: number
}

export type SnipMarkerMetadata = {
  hiddenMessages?: number
}

export type SystemMessageLevel = 'info' | 'warning' | 'error' | 'suggestion'

export type AssistantApiError = 'max_output_tokens' | (string & {})

export type AssistantMessage<
  T extends BetaContentBlock = BetaContentBlock,
> = BaseMessage & {
  type: 'assistant'
  message: AssistantPayload<T>
  research?: unknown
  requestId?: string
  apiError?: AssistantApiError
  error?: SDKAssistantMessageError
  errorDetails?: string
  isMeta?: boolean
  isApiErrorMessage?: boolean
  isVirtual?: true
  advisorModel?: string
}

export type CompactSummaryMetadata = {
  messagesSummarized: number
  userContext?: string
  direction?: PartialCompactDirection
}

export type UserMessage<T extends ContentBlockParam = ContentBlockParam> =
  BaseMessage & {
    type: 'user'
    message: UserPayload<T>
    isMeta?: true
    isVisibleInTranscriptOnly?: true
    isVirtual?: true
    isCompactSummary?: true
    summarizeMetadata?: CompactSummaryMetadata
    toolUseResult?: unknown
    mcpMeta?: {
      _meta?: Record<string, unknown>
      structuredContent?: Record<string, unknown>
    }
    imagePasteIds?: number[]
    planContent?: string
    sourceToolAssistantUUID?: MessageUUID
    sourceToolUseID?: string
    permissionMode?: PermissionMode
    origin?: MessageOrigin
  }

export type AttachmentMessage<T extends AttachmentLike = AttachmentLike> =
  BaseMessage & {
    type: 'attachment'
    attachment: T
  }

export type ProgressMessage<P = unknown> = BaseMessage & {
  type: 'progress'
  data: P
  toolUseID: string
  parentToolUseID: string
}

type BaseSystemMessage = BaseMessage & {
  type: 'system'
  isMeta?: boolean
  content?: string
  level?: SystemMessageLevel
}

export type SystemInformationalMessage = BaseSystemMessage & {
  subtype: 'informational'
  content: string
  level: SystemMessageLevel
  toolUseID?: string
  preventContinuation?: boolean
}

export type SystemPermissionRetryMessage = BaseSystemMessage & {
  subtype: 'permission_retry'
  content: string
  commands: string[]
  level: 'info'
}

export type SystemBridgeStatusMessage = BaseSystemMessage & {
  subtype: 'bridge_status'
  content: string
  url: string
  upgradeNudge?: string
}

export type SystemScheduledTaskFireMessage = BaseSystemMessage & {
  subtype: 'scheduled_task_fire'
  content: string
}

export type SystemStopHookSummaryMessage = BaseSystemMessage & {
  subtype: 'stop_hook_summary'
  hookCount: number
  hookInfos: StopHookInfo[]
  hookErrors: string[]
  preventedContinuation: boolean
  stopReason?: string
  hasOutput: boolean
  level: SystemMessageLevel
  toolUseID?: string
  hookLabel?: string
  totalDurationMs?: number
}

export type SystemTurnDurationMessage = BaseSystemMessage & {
  subtype: 'turn_duration'
  durationMs: number
  budgetTokens?: number
  budgetLimit?: number
  budgetNudges?: number
  messageCount?: number
}

export type SystemAwaySummaryMessage = BaseSystemMessage & {
  subtype: 'away_summary'
  content: string
}

export type SystemMemorySavedMessage = BaseSystemMessage & {
  subtype: 'memory_saved'
  writtenPaths: string[]
  teamCount?: number
  verb?: string
}

export type SystemAgentsKilledMessage = BaseSystemMessage & {
  subtype: 'agents_killed'
}

export type SystemApiMetricsMessage = BaseSystemMessage & {
  subtype: 'api_metrics'
  ttftMs: number
  otps: number
  isP50?: boolean
  hookDurationMs?: number
  turnDurationMs?: number
  toolDurationMs?: number
  classifierDurationMs?: number
  toolCount?: number
  hookCount?: number
  classifierCount?: number
  configWriteCount?: number
}

export type SystemLocalCommandMessage = BaseSystemMessage & {
  subtype: 'local_command'
  content: string
  level: 'info'
}

export type SystemCompactBoundaryMessage = BaseSystemMessage & {
  subtype: 'compact_boundary'
  content: string
  level: 'info'
  compactMetadata: CompactMetadata
  logicalParentUuid?: MessageUUID
}

export type SystemMicrocompactBoundaryMessage = BaseSystemMessage & {
  subtype: 'microcompact_boundary'
  content: string
  level: 'info'
  microcompactMetadata: MicrocompactMetadata
}

export type SystemSnipBoundaryMessage = BaseSystemMessage & {
  subtype: 'snip_boundary'
  content: string
  level: 'info'
  snipMetadata?: SnipBoundaryMetadata
}

export type SystemSnipMarkerMessage = BaseSystemMessage & {
  subtype: 'snip_marker'
  content: string
  level: 'info'
  snipMarkerMetadata?: SnipMarkerMetadata
}

export type SystemAPIErrorMessage = BaseSystemMessage & {
  subtype: 'api_error'
  level: 'error'
  cause?: Error
  error: APIError
  retryInMs: number
  retryAttempt: number
  maxRetries: number
}

export type SystemFileSnapshotMessage = BaseSystemMessage & {
  subtype: 'file_snapshot'
  content: string
  snapshotFiles: Array<{
    key: string
    path: string
    content: string
  }>
}

export type SystemThinkingMessage = BaseSystemMessage & {
  subtype: 'thinking'
  content: string
}

export type SystemMessage =
  | SystemInformationalMessage
  | SystemPermissionRetryMessage
  | SystemBridgeStatusMessage
  | SystemScheduledTaskFireMessage
  | SystemStopHookSummaryMessage
  | SystemTurnDurationMessage
  | SystemAwaySummaryMessage
  | SystemMemorySavedMessage
  | SystemAgentsKilledMessage
  | SystemApiMetricsMessage
  | SystemLocalCommandMessage
  | SystemCompactBoundaryMessage
  | SystemMicrocompactBoundaryMessage
  | SystemSnipBoundaryMessage
  | SystemSnipMarkerMessage
  | SystemAPIErrorMessage
  | SystemFileSnapshotMessage
  | SystemThinkingMessage

export type Message =
  | AssistantMessage
  | UserMessage
  | AttachmentMessage
  | ProgressMessage
  | SystemMessage

export type NormalizedAssistantMessage<
  T extends BetaContentBlock = BetaContentBlock,
> = Omit<AssistantMessage<T>, 'message'> & {
  message: Omit<AssistantPayload<T>, 'content'> & { content: [T] }
}

export type NormalizedUserMessage<
  T extends ContentBlockParam = ContentBlockParam,
> = Omit<UserMessage<T>, 'message'> & {
  message: Omit<UserPayload<T>, 'content'> & { content: [T] }
}

export type NormalizedMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | AttachmentMessage
  | ProgressMessage
  | SystemMessage

export type GroupedToolUseMessage = BaseMessage & {
  type: 'grouped_tool_use'
  toolName: string
  messages: NormalizedAssistantMessage<BetaToolUseBlock>[]
  results: NormalizedUserMessage[]
  displayMessage: NormalizedAssistantMessage<BetaToolUseBlock>
  messageId: string
}

export type CollapsibleMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | AttachmentMessage
  | GroupedToolUseMessage

export type CollapsedReadSearchGroup = BaseMessage & {
  type: 'collapsed_read_search'
  searchCount: number
  readCount: number
  listCount: number
  replCount: number
  memorySearchCount: number
  memoryReadCount: number
  memoryWriteCount: number
  readFilePaths: string[]
  searchArgs: string[]
  latestDisplayHint?: string
  messages: CollapsibleMessage[]
  displayMessage: CollapsibleMessage
  teamMemorySearchCount?: number
  teamMemoryReadCount?: number
  teamMemoryWriteCount?: number
  mcpCallCount?: number
  mcpServerNames?: string[]
  bashCount?: number
  gitOpBashCount?: number
  commits?: Array<{
    kind: 'committed' | 'amended' | 'cherry-picked' | (string & {})
    sha: string
  }>
  pushes?: Array<{
    branch: string
  }>
  branches?: Array<{
    action: 'merged' | 'rebased' | (string & {})
    ref: string
  }>
  prs?: Array<{
    action:
      | 'created'
      | 'edited'
      | 'merged'
      | 'commented'
      | 'closed'
      | 'ready'
      | (string & {})
    number: number
    url?: string
  }>
  hookTotalMs?: number
  hookCount?: number
  hookInfos?: StopHookInfo[]
  relevantMemories?: Array<{
    path: string
    content: string
    mtimeMs: number
    header?: string
  }>
}

export type RenderableMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | AttachmentMessage
  | SystemMessage
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup

export type HookResultMessage = AttachmentMessage | SystemMessage

export type StreamEvent = {
  type: 'stream_event'
  event: BetaRawMessageStreamEvent
  ttftMs?: number
}

export type RequestStartEvent = {
  type: 'stream_request_start'
}

export type TombstoneMessage = {
  type: 'tombstone'
  message: Message
}

export type ToolUseSummaryMessage = BaseMessage & {
  type: 'tool_use_summary'
  summary: string
  precedingToolUseIds: string[]
}
