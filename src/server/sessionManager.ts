export class SessionManager {
  constructor(
    _backend: unknown,
    _options: { idleTimeoutMs: number; maxSessions: number },
  ) {}

  async destroyAll(): Promise<void> {}
}
