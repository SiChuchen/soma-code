import axios from 'axios'
import { randomUUID } from 'crypto'
import { CROSS_SESSION_MESSAGE_TAG } from '../constants/xml.js'
import { getOauthConfig } from '../constants/oauth.js'
import { logForDebugging } from '../utils/debug.js'
import { getOAuthHeaders, prepareApiRequest } from '../utils/teleport/api.js'
import { escapeXmlAttr } from '../utils/xml.js'
import { getSelfBridgeCompatId } from './replBridgeHandle.js'

export type InterClaudeMessageResult =
  | { ok: true }
  | { ok: false; error: string }

function buildCrossSessionEnvelope(from: string, message: string): string {
  return `<${CROSS_SESSION_MESSAGE_TAG} from="${escapeXmlAttr(from)}">
${message}
</${CROSS_SESSION_MESSAGE_TAG}>`
}

function extractApiErrorMessage(data: unknown, status: number): string {
  if (status === 401) {
    return 'authentication failed'
  }
  if (status === 404) {
    return 'target session not found'
  }
  if (status === 409) {
    return 'target session rejected the event'
  }
  if (typeof data === 'string' && data.trim()) {
    return data.trim()
  }
  if (data && typeof data === 'object') {
    const record = data as {
      message?: unknown
      detail?: unknown
      error?: unknown
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim()
    }
    if (typeof record.detail === 'string' && record.detail.trim()) {
      return record.detail.trim()
    }
    if (record.error && typeof record.error === 'object') {
      const error = record.error as { message?: unknown; detail?: unknown }
      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim()
      }
      if (typeof error.detail === 'string' && error.detail.trim()) {
        return error.detail.trim()
      }
    }
  }
  return `unexpected HTTP ${status}`
}

export async function postInterClaudeMessage(
  sessionId: string,
  message: string,
): Promise<InterClaudeMessageResult> {
  const selfSessionId = getSelfBridgeCompatId()
  if (!selfSessionId) {
    return { ok: false, error: 'sender bridge session is unavailable' }
  }

  try {
    const { accessToken, orgUUID } = await prepareApiRequest()
    const url = `${getOauthConfig().BASE_API_URL}/v1/sessions/${sessionId}/events`
    const response = await axios.post(
      url,
      {
        events: [
          {
            uuid: randomUUID(),
            session_id: sessionId,
            type: 'user',
            parent_tool_use_id: null,
            message: {
              role: 'user',
              content: buildCrossSessionEnvelope(
                `bridge:${selfSessionId}`,
                message,
              ),
            },
          },
        ],
      },
      {
        headers: {
          ...getOAuthHeaders(accessToken),
          'anthropic-beta': 'ccr-byoc-2025-07-29',
          'x-organization-uuid': orgUUID,
        },
        timeout: 30_000,
        validateStatus: status => status < 500,
      },
    )

    if (response.status === 200 || response.status === 201) {
      logForDebugging(
        `[bridge:peer] Sent cross-session message from bridge:${selfSessionId} to ${sessionId}`,
      )
      return { ok: true }
    }

    return {
      ok: false,
      error: extractApiErrorMessage(response.data, response.status),
    }
  } catch (error) {
    const messageText =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : 'request threw'
    logForDebugging(
      `[bridge:peer] Failed sending to ${sessionId}: ${messageText}`,
      { level: 'warn' },
    )
    return { ok: false, error: messageText }
  }
}
