const UNAVAILABLE_MESSAGE =
  'Background session management is unavailable in this reconstructed snapshot.'

function exitUnavailable(): void {
  process.stderr.write(`${UNAVAILABLE_MESSAGE}\n`)
  process.exitCode = 1
}

export async function psHandler(_args: string[]): Promise<void> {
  exitUnavailable()
}

export async function logsHandler(_sessionId?: string): Promise<void> {
  exitUnavailable()
}

export async function attachHandler(_sessionId?: string): Promise<void> {
  exitUnavailable()
}

export async function killHandler(_sessionId?: string): Promise<void> {
  exitUnavailable()
}

export async function handleBgFlag(_args: string[]): Promise<void> {
  exitUnavailable()
}
