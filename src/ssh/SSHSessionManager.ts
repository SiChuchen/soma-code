import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import type { SDKControlPermissionRequest } from '../entrypoints/sdk/controlTypes.js'
import type { RemoteMessageContent } from '../utils/teleport/api.js'

export type SSHSessionCallbacks = {
  onMessage: (message: SDKMessage) => void
  onPermissionRequest: (
    request: SDKControlPermissionRequest,
    requestId: string,
  ) => void
  onConnected?: () => void
  onReconnecting?: (attempt: number, maxAttempts: number) => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

const UNAVAILABLE_MESSAGE =
  'SSH remote sessions are unavailable in this reconstructed snapshot.'

export class SSHSessionManager {
  constructor(private readonly callbacks: SSHSessionCallbacks) {}

  connect(): void {
    this.callbacks.onError?.(new Error(UNAVAILABLE_MESSAGE))
  }

  disconnect(): void {}

  async sendMessage(_content: RemoteMessageContent): Promise<boolean> {
    return false
  }

  sendInterrupt(): void {}

  respondToPermissionRequest(
    _requestId: string,
    _response:
      | { behavior: 'allow'; updatedInput: Record<string, unknown> }
      | { behavior: 'deny'; message: string },
  ): void {}
}
