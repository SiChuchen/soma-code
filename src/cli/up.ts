const UNAVAILABLE_MESSAGE =
  'The claude up workflow is unavailable in this reconstructed snapshot.'

export async function up(): Promise<void> {
  process.stderr.write(`${UNAVAILABLE_MESSAGE}\n`)
  process.exitCode = 1
}
