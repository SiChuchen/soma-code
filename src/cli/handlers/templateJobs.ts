const UNAVAILABLE_MESSAGE =
  'Template job commands are unavailable in this reconstructed snapshot.'

export async function templatesMain(_args: string[]): Promise<void> {
  process.stderr.write(`${UNAVAILABLE_MESSAGE}\n`)
  process.exitCode = 1
}
