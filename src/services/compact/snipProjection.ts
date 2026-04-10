import type {
  Message,
  SystemSnipBoundaryMessage,
  SystemSnipMarkerMessage,
} from '../../types/message.js'

export function isSnipBoundaryMessage(
  message: Message | null | undefined,
): message is SystemSnipBoundaryMessage {
  return message?.type === 'system' && message.subtype === 'snip_boundary'
}

export function isSnipMarkerMessage(
  message: Message | null | undefined,
): message is SystemSnipMarkerMessage {
  return message?.type === 'system' && message.subtype === 'snip_marker'
}

export function projectSnippedView(messages: Message[]): Message[] {
  return messages.filter(message => !isSnipMarkerMessage(message))
}
