import { homedir } from 'os'
import { join } from 'path'
import { getAppConfigHomeDir } from './envUtils.js'

export const DEFAULT_PACKAGE_NAME = 'soma-code'
export const DEFAULT_GITHUB_REPOSITORY = 'SiChuchen/soma-code'
export const DEFAULT_GITHUB_BRANCH = 'master'
export const DEFAULT_PACKAGE_INSTALL_SPEC =
  `https://github.com/${DEFAULT_GITHUB_REPOSITORY}/archive/refs/heads/${DEFAULT_GITHUB_BRANCH}.tar.gz`

function getMacroString(key: string): string | null {
  if (typeof MACRO === 'undefined') {
    return null
  }

  const value = MACRO[key]
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeGitHubRepository(value: string): string | null {
  const normalized = value.replace(/\.git$/, '').replace(/^\/+|\/+$/g, '')
  return /^[^/]+\/[^/]+$/.test(normalized) ? normalized : null
}

function getGitHubDefaultBranch(): string {
  return getMacroString('GITHUB_DEFAULT_BRANCH') ?? DEFAULT_GITHUB_BRANCH
}

export function getPackageName(): string {
  return getMacroString('PACKAGE_NAME') ?? DEFAULT_PACKAGE_NAME
}

export function getPackageInstallSpec(): string {
  return getMacroString('PACKAGE_URL') ?? DEFAULT_PACKAGE_INSTALL_SPEC
}

export function getNativePackageInstallSpec(): string | null {
  return getMacroString('NATIVE_PACKAGE_URL')
}

export function isNativeInstallerAvailable(): boolean {
  return getNativePackageInstallSpec() !== null
}

export function extractGitHubRepositoryFromSpec(
  packageSpec: string,
): string | null {
  const normalizedSpec = packageSpec.trim().replace(/#.*$/, '')

  if (normalizedSpec.startsWith('github:')) {
    return normalizeGitHubRepository(normalizedSpec.slice('github:'.length))
  }

  const archiveMatch = normalizedSpec.match(
    /^https:\/\/github\.com\/(.+?)\/archive\/refs\/(?:heads|tags)\/.+\.tar\.gz$/,
  )
  if (archiveMatch?.[1]) {
    return normalizeGitHubRepository(archiveMatch[1])
  }

  const codeloadMatch = normalizedSpec.match(
    /^https:\/\/codeload\.github\.com\/(.+?)\/tar\.gz\/.+$/,
  )
  if (codeloadMatch?.[1]) {
    return normalizeGitHubRepository(codeloadMatch[1])
  }

  const httpsMatch = normalizedSpec.match(
    /^(?:git\+)?https:\/\/github\.com\/(.+?)(?:\.git)?$/,
  )
  if (httpsMatch?.[1]) {
    return normalizeGitHubRepository(httpsMatch[1])
  }

  const sshMatch = normalizedSpec.match(
    /^(?:ssh:\/\/)?git@github\.com[:/]([^#]+?)(?:\.git)?$/,
  )
  if (sshMatch?.[1]) {
    return normalizeGitHubRepository(sshMatch[1])
  }

  return null
}

export function isGitHubInstallSpec(
  packageSpec: string = getPackageInstallSpec(),
): boolean {
  return extractGitHubRepositoryFromSpec(packageSpec) !== null
}

export function getGitHubRepository(): string {
  return (
    getMacroString('GITHUB_REPOSITORY') ??
    extractGitHubRepositoryFromSpec(getPackageInstallSpec()) ??
    DEFAULT_GITHUB_REPOSITORY
  )
}

export function getGitHubRepositoryUrl(): string {
  return (
    getMacroString('GITHUB_REPOSITORY_URL') ??
    `https://github.com/${getGitHubRepository()}`
  )
}

export function getGitHubIssuesUrl(): string {
  return (
    getMacroString('GITHUB_ISSUES_URL') ??
    `${getGitHubRepositoryUrl()}/issues`
  )
}

export function getGitHubPackageManifestUrl(): string {
  return `https://raw.githubusercontent.com/${getGitHubRepository()}/refs/heads/${getGitHubDefaultBranch()}/package.json`
}

export function getPackageInstallTargetFromSpec(
  packageSpec: string,
  tagOrVersion?: string | null,
): string {
  if (!tagOrVersion || isGitHubInstallSpec(packageSpec)) {
    return packageSpec
  }

  return `${packageSpec}@${tagOrVersion}`
}

export function getPackageInstallTarget(tagOrVersion?: string | null): string {
  return getPackageInstallTargetFromSpec(getPackageInstallSpec(), tagOrVersion)
}

export function getKnownPackageNames(): string[] {
  return [...new Set(['@anthropic-ai/claude-code', getPackageName()])]
}

export function getPackageManagerUpdateInstruction(
  packageManager: string,
): string {
  switch (packageManager) {
    case 'homebrew':
      return 'Use your Homebrew update command for the installed somacode package.'
    case 'winget':
      return 'Use your winget update command for the installed somacode package.'
    case 'apk':
      return 'Use your apk update command for the installed somacode package.'
    default:
      return 'Use your package manager update command for the installed somacode package.'
  }
}

export function getGlobalInstallCommand(): string {
  return `npm install -g ${getPackageInstallTarget()}`
}

export function getLocalInstallDirDisplayPath(): string {
  const localInstallDir = join(getAppConfigHomeDir(), 'local')
  const homeDir = homedir()

  if (localInstallDir.startsWith(homeDir)) {
    return `~${localInstallDir.slice(homeDir.length)}`
  }

  return localInstallDir
}

export function getLocalInstallCommand(): string {
  return `cd ${getLocalInstallDirDisplayPath()} && npm install ${getPackageInstallTarget()}`
}
