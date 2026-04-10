import type { AssistantMessage } from '../types/message.js'

export async function classifyAndWriteState(
  jobDir: string,
  assistantMessages: readonly AssistantMessage[],
): Promise<void> {
  // Phase 1 compatibility layer: template-job state classification is still
  // unrecovered in this snapshot, but stopHooks needs a callable async hook.
  void jobDir
  void assistantMessages
}
