const UNAVAILABLE_MESSAGE =
  'Direct-connect headless mode is unavailable in this reconstructed snapshot.'

export async function runConnectHeadless(
  _config: unknown,
  _prompt: string,
  _outputFormat: string,
  _interactive: boolean,
): Promise<void> {
  process.stderr.write(`${UNAVAILABLE_MESSAGE}\n`)
  process.exitCode = 1
}
