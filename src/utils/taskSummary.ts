type TaskSummaryArgs = {
  systemPrompt: unknown
  userContext: Record<string, string>
  systemContext: Record<string, string>
  toolUseContext: {
    agentId?: string
  }
  forkContextMessages: readonly unknown[]
}

export function shouldGenerateTaskSummary(): boolean {
  return false
}

export function maybeGenerateTaskSummary(args: TaskSummaryArgs): void {
  // Phase 1 compatibility layer: background session summaries are unrecovered
  // in this snapshot, so the gated query hook becomes a no-op.
  void args
}
