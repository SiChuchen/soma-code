const UNAVAILABLE_MESSAGE =
  'Environment runner mode is unavailable in this reconstructed snapshot.'

export async function environmentRunnerMain(_args: string[]): Promise<void> {
  process.stderr.write(`${UNAVAILABLE_MESSAGE}\n`)
  process.exitCode = 1
}
