export type FsReadRestrictionConfig = {
  denyOnly: string[]
  allowWithinDeny?: string[]
}

export type FsWriteRestrictionConfig = {
  allowOnly: string[]
  denyWithinAllow: string[]
}

export type IgnoreViolationsConfig = Record<string, unknown>

export type NetworkHostPattern = {
  host: string
}

export type NetworkRestrictionConfig = {
  allowedHosts?: string[]
  deniedHosts?: string[]
  allowUnixSockets?: string[]
  allowLocalBinding?: boolean
}

export type SandboxAskCallback = (
  hostPattern: NetworkHostPattern,
) => boolean | Promise<boolean>

export type SandboxDependencyCheck = {
  errors: string[]
  warnings: string[]
}

export type SandboxViolationEvent = {
  timestamp: Date
  line: string
  command?: string
}

export type SandboxRuntimeConfig = {
  filesystem?: {
    read?: FsReadRestrictionConfig
    write?: FsWriteRestrictionConfig
  }
  network?: NetworkRestrictionConfig
  ignoreViolations?: IgnoreViolationsConfig
  enableWeakerNestedSandbox?: boolean
}

export class SandboxViolationStore {
  subscribe(
    listener: (violations: SandboxViolationEvent[]) => void,
  ): () => void
  getTotalCount(): number
  getViolations(): SandboxViolationEvent[]
  add(violation: SandboxViolationEvent): void
  clear(): void
}

export const SandboxRuntimeConfigSchema: {
  parse(config: SandboxRuntimeConfig): SandboxRuntimeConfig
  safeParse(config: SandboxRuntimeConfig): {
    success: true
    data: SandboxRuntimeConfig
  }
}

export class SandboxManager {
  static checkDependencies(): SandboxDependencyCheck
  static isSupportedPlatform(): boolean
  static initialize(
    config?: SandboxRuntimeConfig,
    callback?: SandboxAskCallback,
  ): Promise<void>
  static updateConfig(config?: SandboxRuntimeConfig): void
  static getFsReadConfig(): FsReadRestrictionConfig
  static getFsWriteConfig(): FsWriteRestrictionConfig
  static getNetworkRestrictionConfig(): NetworkRestrictionConfig
  static getIgnoreViolations(): IgnoreViolationsConfig | undefined
  static getAllowUnixSockets(): string[] | undefined
  static getAllowLocalBinding(): boolean | undefined
  static getEnableWeakerNestedSandbox(): boolean | undefined
  static getProxyPort(): number | undefined
  static getSocksProxyPort(): number | undefined
  static getLinuxHttpSocketPath(): string | undefined
  static getLinuxSocksSocketPath(): string | undefined
  static waitForNetworkInitialization(): Promise<boolean>
  static wrapWithSandbox(
    command: string,
    binShell?: string,
    customConfig?: Partial<SandboxRuntimeConfig>,
    abortSignal?: AbortSignal,
  ): Promise<string>
  static getSandboxViolationStore(): SandboxViolationStore
  static annotateStderrWithSandboxFailures(
    command: string,
    stderr: string,
  ): string
  static cleanupAfterCommand(): void
  static reset(): Promise<void>
}
