import { readFileSync } from 'fs'

type RuntimeMacroValues = {
  VERSION: string
  PACKAGE_NAME: string
  BUILD_TIME: string
  PACKAGE_URL: string
  NATIVE_PACKAGE_URL: string | null
  FEEDBACK_CHANNEL: string
  ISSUES_EXPLAINER: string
  VERSION_CHANGELOG: string
  GITHUB_REPOSITORY: string
  GITHUB_REPOSITORY_URL: string
  GITHUB_ISSUES_URL: string
}

const DEFAULT_MACRO_VALUES: RuntimeMacroValues = {
  VERSION: '1.0.0',
  PACKAGE_NAME: 'soma-code',
  BUILD_TIME: '',
  PACKAGE_URL: 'github:SiChuchen/soma-code',
  NATIVE_PACKAGE_URL: null,
  FEEDBACK_CHANNEL: 'GitHub Issues: https://github.com/SiChuchen/soma-code/issues',
  ISSUES_EXPLAINER:
    'open an issue at https://github.com/SiChuchen/soma-code/issues',
  VERSION_CHANGELOG: '',
  GITHUB_REPOSITORY: 'SiChuchen/soma-code',
  GITHUB_REPOSITORY_URL: 'https://github.com/SiChuchen/soma-code',
  GITHUB_ISSUES_URL: 'https://github.com/SiChuchen/soma-code/issues',
}

function loadPackageMetadata(): {
  name: string
  version: string
} {
  const candidates = [
    new URL('../../package.json', import.meta.url),
    new URL('../../../package.json', import.meta.url),
  ]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8'))
      if (
        parsed &&
        typeof parsed.version === 'string' &&
        parsed.version.length > 0
      ) {
        return {
          name:
            typeof parsed.name === 'string' && parsed.name.length > 0
              ? parsed.name
              : DEFAULT_MACRO_VALUES.PACKAGE_NAME,
          version: parsed.version,
        }
      }
    } catch {
      // Fall through to the next candidate path.
    }
  }

  return {
    name: DEFAULT_MACRO_VALUES.PACKAGE_NAME,
    version: DEFAULT_MACRO_VALUES.VERSION,
  }
}

function ensureMacroRuntime(): void {
  if (typeof MACRO !== 'undefined') {
    return
  }

  const packageMetadata = loadPackageMetadata()
  const macroValues: RuntimeMacroValues = {
    ...DEFAULT_MACRO_VALUES,
    PACKAGE_NAME: packageMetadata.name,
    VERSION: packageMetadata.version,
  }

  globalThis.eval(
    `var MACRO = new Proxy(${JSON.stringify(macroValues)}, { get: (target, prop) => prop in target ? target[prop] : '' });`,
  )
}

ensureMacroRuntime()
