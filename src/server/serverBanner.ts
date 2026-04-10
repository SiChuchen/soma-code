export function printBanner(
  config: { host: string; unix?: string },
  authToken: string,
  port: number,
): void {
  const location = config.unix ? `unix:${config.unix}` : `http://${config.host}:${port}`
  process.stderr.write(
    `Claude server compatibility stub listening at ${location}\nAuth token: ${authToken}\n`,
  )
}
