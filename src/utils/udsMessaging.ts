import { tmpdir } from 'os'
import { join } from 'path'

type StartUdsMessagingOptions = {
  isExplicit?: boolean
}

type OnEnqueueCallback = (() => void) | undefined

let currentSocketPath: string | null = null
let onEnqueue: OnEnqueueCallback

export function getDefaultUdsSocketPath(): string {
  return join(tmpdir(), `claude-code-${process.pid}.sock`)
}

export function getUdsMessagingSocketPath(): string {
  return (
    currentSocketPath ??
    process.env.CLAUDE_CODE_MESSAGING_SOCKET ??
    getDefaultUdsSocketPath()
  )
}

export async function startUdsMessaging(
  socketPath: string,
  options?: StartUdsMessagingOptions,
): Promise<void> {
  currentSocketPath = socketPath
  process.env.CLAUDE_CODE_MESSAGING_SOCKET = socketPath
  void options
}

export function setOnEnqueue(callback: (() => void) | undefined): void {
  onEnqueue = callback
}

export function notifyLocalUdsEnqueue(): void {
  onEnqueue?.()
}
