const UNAVAILABLE_MESSAGE =
  'Self-hosted runner mode is unavailable in this reconstructed snapshot.'

export async function selfHostedRunnerMain(_args: string[]): Promise<void> {
  process.stderr.write(`${UNAVAILABLE_MESSAGE}\n`)
  process.exitCode = 1
}
