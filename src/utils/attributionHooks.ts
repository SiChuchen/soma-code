export function registerAttributionHooks(): void {
  // Phase 1 compatibility layer: keep setup() and dynamic imports stable until
  // the original commit-attribution hook wiring is reconstructed.
}

export function clearAttributionCaches(): void {
  // No-op by design in the reconstructed snapshot.
}

export function sweepFileContentCache(): void {
  // No-op by design in the reconstructed snapshot.
}
