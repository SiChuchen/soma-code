import type { MemoryScope } from '../utils/memoryFileDetection.js'
import type { MemoryHeader } from './memoryScan.js'

export function logMemoryWriteShape(
  toolName: string,
  toolInput: unknown,
  filePath: string,
  scope: MemoryScope,
): void {
  // Phase 1 compatibility layer: keep write hooks callable until the
  // original telemetry implementation is reconstructed from local sources.
  void toolName
  void toolInput
  void filePath
  void scope
}

export function logMemoryRecallShape(
  memories: readonly MemoryHeader[],
  selected: readonly MemoryHeader[],
): void {
  // Phase 1 compatibility layer: preserve the recall call site without
  // inventing telemetry semantics that are not recoverable from this snapshot.
  void memories
  void selected
}
