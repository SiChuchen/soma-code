export type AssistantSession = {
  id: string
  title?: string
  updatedAt?: string
  environmentId?: string
}

export async function discoverAssistantSessions(): Promise<AssistantSession[]> {
  return []
}
