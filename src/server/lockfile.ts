type RunningServer = {
  pid: number
  port: number
  host: string
  httpUrl: string
  startedAt: number
}

export async function writeServerLock(_server: RunningServer): Promise<void> {}

export async function removeServerLock(): Promise<void> {}

export async function probeRunningServer(): Promise<RunningServer | null> {
  return null
}
