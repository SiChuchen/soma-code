import type { PermissionMode } from '../types/permissions.js'
import { SSHSessionManager, type SSHSessionCallbacks } from './SSHSessionManager.js'

const UNAVAILABLE_MESSAGE =
  'SSH remote sessions are unavailable in this reconstructed snapshot.'

export class SSHSessionError extends Error {
  constructor(message = UNAVAILABLE_MESSAGE) {
    super(message)
    this.name = 'SSHSessionError'
  }
}

export type SSHSession = {
  remoteCwd: string
  proc: {
    exitCode: number | null
    signalCode: NodeJS.Signals | null
  }
  proxy: {
    stop(): void
  }
  createManager(callbacks: SSHSessionCallbacks): SSHSessionManager
  getStderrTail(): string
}

type CommonCreateSSHSessionOptions = {
  cwd?: string
  permissionMode?: PermissionMode
  dangerouslySkipPermissions?: boolean
}

export type CreateSSHSessionOptions = CommonCreateSSHSessionOptions & {
  host: string
  localVersion: string
  extraCliArgs?: string[]
}

export type CreateLocalSSHSessionOptions = CommonCreateSSHSessionOptions

export type SSHSessionProgressCallbacks = {
  onProgress?: (message: string) => void
}

export async function createSSHSession(
  _options: CreateSSHSessionOptions,
  callbacks: SSHSessionProgressCallbacks = {},
): Promise<SSHSession> {
  callbacks.onProgress?.('ssh remote mode unavailable in reconstructed snapshot')
  throw new SSHSessionError()
}

export function createLocalSSHSession(
  _options: CreateLocalSSHSessionOptions,
): SSHSession {
  throw new SSHSessionError()
}
