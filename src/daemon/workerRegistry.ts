const UNAVAILABLE_MESSAGE =
  'Daemon worker execution is unavailable in this reconstructed snapshot.'

export async function runDaemonWorker(_kind?: string): Promise<void> {
  process.stderr.write(`${UNAVAILABLE_MESSAGE}\n`)
  process.exitCode = 1
}
