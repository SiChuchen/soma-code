import type { LogOption } from '../types/logs.js'

const UNSUPPORTED_MESSAGE =
  'ccshare resume is unavailable in this reconstructed snapshot.'

export function parseCcshareId(value: string): string | null {
  const match = value.match(/ccshare\/([A-Za-z0-9._-]+)$/)
  return match?.[1] ?? null
}

export async function loadCcshare(_ccshareId: string): Promise<LogOption> {
  throw new Error(UNSUPPORTED_MESSAGE)
}
