export type LiveSession = {
  sessionId?: string
  kind?: string
  address?: string
  source?: 'uds'
}

export async function listAllLiveSessions(): Promise<LiveSession[]> {
  // Phase 1 compatibility layer: UDS session discovery is unavailable, so the
  // caller treats the live-session set as empty.
  return []
}

export async function sendToUdsSocket(
  socketPath: string,
  message: string,
): Promise<void> {
  void socketPath
  void message
  throw new Error('UDS messaging is unavailable in this reconstructed snapshot')
}
