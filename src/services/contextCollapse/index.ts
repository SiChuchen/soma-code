import type { QuerySource } from '../../constants/querySource.js'
import type { ToolUseContext } from '../../Tool.js'
import type { AssistantMessage, Message, StreamEvent } from '../../types/message.js'
import { createSignal } from '../../utils/signal.js'

export type ContextCollapseHealth = {
  totalErrors: number
  totalSpawns: number
  totalEmptySpawns: number
  emptySpawnWarningEmitted: boolean
  lastError?: string
}

export type ContextCollapseStats = {
  collapsedSpans: number
  collapsedMessages: number
  stagedSpans: number
  health: ContextCollapseHealth
}

type CollapseProjectionResult = {
  messages: Message[]
}

type OverflowRecoveryResult = {
  committed: number
  messages: Message[]
}

const changed = createSignal()

function createEmptyStats(): ContextCollapseStats {
  return {
    collapsedSpans: 0,
    collapsedMessages: 0,
    stagedSpans: 0,
    health: {
      totalErrors: 0,
      totalSpawns: 0,
      totalEmptySpawns: 0,
      emptySpawnWarningEmitted: false,
    },
  }
}

let stats = createEmptyStats()

export const subscribe = changed.subscribe

export function initContextCollapse(): void {}

export function resetContextCollapse(): void {
  stats = createEmptyStats()
  changed.emit()
}

export function isContextCollapseEnabled(): boolean {
  return false
}

export function getStats(): ContextCollapseStats {
  return stats
}

export async function applyCollapsesIfNeeded(
  messages: Message[],
  _toolUseContext: ToolUseContext,
  _querySource?: QuerySource,
): Promise<CollapseProjectionResult> {
  return { messages }
}

export function recoverFromOverflow(
  messages: Message[],
  _querySource?: QuerySource,
): OverflowRecoveryResult {
  return {
    committed: 0,
    messages,
  }
}

export function isWithheldPromptTooLong(
  _message: AssistantMessage | StreamEvent | undefined,
  _isPromptTooLongMessage: (message: AssistantMessage) => boolean,
  _querySource?: QuerySource,
): boolean {
  return false
}
