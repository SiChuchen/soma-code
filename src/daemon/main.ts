const UNAVAILABLE_MESSAGE =
  'Daemon supervisor mode is unavailable in this reconstructed snapshot.'

export async function daemonMain(_args: string[]): Promise<void> {
  process.stderr.write(`${UNAVAILABLE_MESSAGE}\n`)
  process.exitCode = 1
}
