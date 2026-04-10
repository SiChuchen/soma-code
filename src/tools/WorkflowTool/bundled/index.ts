let initialized = false

export function initBundledWorkflows(): void {
  initialized = true
}

export function areBundledWorkflowsInitialized(): boolean {
  return initialized
}
