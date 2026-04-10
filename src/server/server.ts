type StubServer = {
  port?: number
  stop: (_force?: boolean) => void
}

export function startServer(
  config: { port?: number },
  _sessionManager: unknown,
  _logger: unknown,
): StubServer {
  return {
    port: config.port,
    stop: () => {},
  }
}
