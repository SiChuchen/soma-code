const UNAVAILABLE_MESSAGE =
  'Rollback flows are unavailable in this reconstructed snapshot.'

export async function rollback(
  _target?: string,
  _options?: {
    list?: boolean
    dryRun?: boolean
    safe?: boolean
  },
): Promise<void> {
  process.stderr.write(`${UNAVAILABLE_MESSAGE}\n`)
  process.exitCode = 1
}
