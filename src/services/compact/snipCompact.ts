import type { Message, SystemSnipBoundaryMessage } from '../../types/message.js'
import {
  isSnipBoundaryMessage,
  isSnipMarkerMessage,
  projectSnippedView,
} from './snipProjection.js'

export const SNIP_NUDGE_TEXT =
  'If older context is no longer relevant, prefer snipping it instead of carrying unnecessary history forward.'

export type SnipCompactOptions = {
  force?: boolean
}

export type SnipCompactResult = {
  messages: Message[]
  tokensFreed: number
  boundaryMessage?: SystemSnipBoundaryMessage
  executed: boolean
}

function isEnvTruthy(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function isSnipRuntimeEnabled(): boolean {
  return (
    process.env.USER_TYPE === 'ant' &&
    isEnvTruthy(process.env.CLAUDE_ENABLE_HISTORY_SNIP) &&
    !isEnvTruthy(process.env.DISABLE_COMPACT)
  )
}

export function shouldNudgeForSnips(_messages: Message[]): boolean {
  return false
}

export { isSnipBoundaryMessage, isSnipMarkerMessage }

export function snipCompactIfNeeded(
  messages: Message[],
  options?: SnipCompactOptions,
): SnipCompactResult {
  if (!isSnipRuntimeEnabled() && !options?.force) {
    return {
      messages,
      tokensFreed: 0,
      executed: false,
    }
  }

  const cleaned = projectSnippedView(messages)
  const removedMarkers = messages.filter(isSnipMarkerMessage).length
  const executed =
    !!options?.force &&
    (removedMarkers > 0 || messages.some(isSnipBoundaryMessage))

  return {
    messages: cleaned,
    tokensFreed: 0,
    executed,
  }
}
