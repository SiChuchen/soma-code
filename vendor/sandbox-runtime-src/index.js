const defaultReadConfig = {
  denyOnly: [],
}

const defaultWriteConfig = {
  allowOnly: [],
  denyWithinAllow: [],
}

const defaultDependencyCheck = {
  errors: ['sandbox runtime unavailable in reconstructed snapshot'],
  warnings: [],
}

class SandboxViolationStore {
  constructor() {
    this._listeners = new Set()
    this._violations = []
  }

  subscribe(listener) {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  getTotalCount() {
    return this._violations.length
  }

  getViolations() {
    return [...this._violations]
  }

  add(violation) {
    this._violations.push(violation)
    this._notify()
  }

  clear() {
    if (this._violations.length === 0) return
    this._violations = []
    this._notify()
  }

  _notify() {
    const snapshot = this.getViolations()
    for (const listener of this._listeners) {
      listener(snapshot)
    }
  }
}

const violationStore = new SandboxViolationStore()

function normalizeConfig(config = {}) {
  const filesystem = config.filesystem ?? {}
  const network = config.network ?? {}

  return {
    ...config,
    filesystem: {
      ...filesystem,
      read: {
        ...defaultReadConfig,
        ...(filesystem.read ?? {}),
      },
      write: {
        ...defaultWriteConfig,
        ...(filesystem.write ?? {}),
      },
    },
    network: {
      ...network,
    },
  }
}

let currentConfig = normalizeConfig()

export const SandboxRuntimeConfigSchema = {
  parse(config) {
    return normalizeConfig(config)
  },
  safeParse(config) {
    return {
      success: true,
      data: normalizeConfig(config),
    }
  },
}

export class SandboxManager {
  static checkDependencies() {
    return defaultDependencyCheck
  }

  static isSupportedPlatform() {
    return process.platform === 'darwin' || process.platform === 'linux'
  }

  static async initialize(config) {
    currentConfig = normalizeConfig(config)
  }

  static updateConfig(config) {
    currentConfig = normalizeConfig(config)
  }

  static getFsReadConfig() {
    return currentConfig.filesystem.read
  }

  static getFsWriteConfig() {
    return currentConfig.filesystem.write
  }

  static getNetworkRestrictionConfig() {
    return currentConfig.network
  }

  static getIgnoreViolations() {
    return currentConfig.ignoreViolations
  }

  static getAllowUnixSockets() {
    return currentConfig.network.allowUnixSockets
  }

  static getAllowLocalBinding() {
    return currentConfig.network.allowLocalBinding
  }

  static getEnableWeakerNestedSandbox() {
    return currentConfig.enableWeakerNestedSandbox
  }

  static getProxyPort() {
    return undefined
  }

  static getSocksProxyPort() {
    return undefined
  }

  static getLinuxHttpSocketPath() {
    return undefined
  }

  static getLinuxSocksSocketPath() {
    return undefined
  }

  static async waitForNetworkInitialization() {
    return false
  }

  static async wrapWithSandbox(command) {
    return command
  }

  static getSandboxViolationStore() {
    return violationStore
  }

  static annotateStderrWithSandboxFailures(_command, stderr) {
    return stderr
  }

  static cleanupAfterCommand() {}

  static async reset() {
    currentConfig = normalizeConfig()
    violationStore.clear()
  }
}

export { SandboxViolationStore }
