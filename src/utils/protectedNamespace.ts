function getNamespaceSignals(): string[] {
  return [
    process.env.POD_NAMESPACE,
    process.env.KUBERNETES_NAMESPACE,
    process.env.COO_NAMESPACE,
    process.env.NAMESPACE,
  ].filter((value): value is string => typeof value === 'string' && value !== '')
}

export function checkProtectedNamespace(): boolean {
  // Phase 1 compatibility layer: keep the ant-only telemetry callsite stable
  // without shipping internal namespace allowlists. No cluster signal means
  // local/unmanaged usage; any explicit namespace signal is treated as
  // protected by default.
  return getNamespaceSignals().length > 0
}
