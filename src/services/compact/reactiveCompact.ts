import type { QuerySource } from '../../constants/querySource.js'
import type { Message } from '../../types/message.js'
import { hasExactErrorMessage, isAbortError } from '../../utils/errors.js'
import type { CacheSafeParams } from '../../utils/forkedAgent.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../analytics/growthbook.js'
import {
  isMediaSizeErrorMessage,
  isPromptTooLongMessage,
} from '../api/errors.js'
import {
  compactConversation,
  type CompactionResult,
  ERROR_MESSAGE_INCOMPLETE_RESPONSE,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  stripImagesFromMessages,
} from './compact.js'

export type ReactiveCompactFailureReason =
  | 'too_few_groups'
  | 'aborted'
  | 'exhausted'
  | 'error'
  | 'media_unstrippable'

export type ReactiveCompactOutcome =
  | {
      ok: true
      result: CompactionResult
    }
  | {
      ok: false
      reason: ReactiveCompactFailureReason
      error?: unknown
    }

export type ReactiveCompactParams = {
  hasAttempted: boolean
  querySource?: QuerySource
  aborted: boolean
  messages: Message[]
  cacheSafeParams: CacheSafeParams
}

export type ReactiveCompactOptions = {
  trigger: 'auto' | 'manual'
  customInstructions?: string
}

function isEnvTruthy(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function isReactiveCompactEnabled(): boolean {
  if (isEnvTruthy(process.env.DISABLE_COMPACT)) {
    return false
  }

  return (
    isEnvTruthy(process.env.CLAUDE_ENABLE_REACTIVE_COMPACT) ||
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_cobalt_raccoon', false)
  )
}

export function isReactiveOnlyMode(): boolean {
  return isReactiveCompactEnabled()
}

export function isWithheldPromptTooLong(
  message: Message | undefined,
): boolean {
  return (
    isReactiveCompactEnabled() &&
    message?.type === 'assistant' &&
    isPromptTooLongMessage(message)
  )
}

export function isWithheldMediaSizeError(
  message: Message | undefined,
): boolean {
  return (
    isReactiveCompactEnabled() &&
    message?.type === 'assistant' &&
    isMediaSizeErrorMessage(message)
  )
}

function prepareMessagesForReactiveCompact(messages: Message[]): {
  messages: Message[]
  strippedMedia: boolean
} {
  const stripped = stripImagesFromMessages(messages)
  return {
    messages: stripped,
    strippedMedia: stripped.some((message, index) => message !== messages[index]),
  }
}

export async function reactiveCompactOnPromptTooLong(
  messages: Message[],
  cacheSafeParams: CacheSafeParams,
  options: ReactiveCompactOptions,
): Promise<ReactiveCompactOutcome> {
  const prepared = prepareMessagesForReactiveCompact(messages)

  if (messages.length === 0) {
    return { ok: false, reason: 'too_few_groups' }
  }

  try {
    const result = await compactConversation(
      prepared.messages,
      cacheSafeParams.toolUseContext,
      cacheSafeParams,
      false,
      options.customInstructions,
      options.trigger === 'auto',
    )

    return {
      ok: true,
      result,
    }
  } catch (error) {
    if (
      cacheSafeParams.toolUseContext.abortController.signal.aborted ||
      isAbortError(error)
    ) {
      return { ok: false, reason: 'aborted', error }
    }

    if (hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES)) {
      return { ok: false, reason: 'too_few_groups', error }
    }

    if (
      !prepared.strippedMedia &&
      messages.some(
        message =>
          message.type === 'user' &&
          Array.isArray(message.message.content) &&
          message.message.content.some(
            block => block.type === 'image' || block.type === 'document',
          ),
      )
    ) {
      return { ok: false, reason: 'media_unstrippable', error }
    }

    if (hasExactErrorMessage(error, ERROR_MESSAGE_INCOMPLETE_RESPONSE)) {
      return { ok: false, reason: 'exhausted', error }
    }

    return { ok: false, reason: 'error', error }
  }
}

export async function tryReactiveCompact(
  params: ReactiveCompactParams,
): Promise<CompactionResult | null> {
  if (
    !isReactiveCompactEnabled() ||
    params.hasAttempted ||
    params.aborted ||
    params.messages.length === 0
  ) {
    return null
  }

  const outcome = await reactiveCompactOnPromptTooLong(
    params.messages,
    params.cacheSafeParams,
    { trigger: 'auto' },
  )

  return outcome.ok ? outcome.result : null
}
