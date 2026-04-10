import { homedir } from 'os'
import { dirname, extname, join, resolve } from 'path'
import { fileSuffixForOauthConfig } from '../constants/oauth.js'
import { logForDebugging } from './debug.js'
import { getAppConfigHomeDir, getConfigDirOverride } from './envUtils.js'
import { getErrnoCode } from './errors.js'
import { getFsImplementation } from './fsOperations.js'

export const PROJECT_CONFIG_DIR_NAME = '.soma'
export const LEGACY_PROJECT_CONFIG_DIR_NAME = '.claude'

const MIGRATION_CONFLICTS_DIR = 'migration-conflicts'
const migratedProjectRoots = new Set<string>()
const attemptedHomeMigrations = new Set<string>()

function uniquePaths(paths: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      paths
        .filter((path): path is string => !!path)
        .map(path => resolve(path).normalize('NFC')),
    ),
  )
}

function ensureParentDir(path: string): void {
  getFsImplementation().mkdirSync(dirname(path))
}

function isSamePath(a: string, b: string): boolean {
  return resolve(a).normalize('NFC') === resolve(b).normalize('NFC')
}

function removeIfExists(path: string): void {
  const fs = getFsImplementation()
  if (!fs.existsSync(path)) {
    return
  }

  const stat = fs.lstatSync(path)
  if (stat.isDirectory()) {
    fs.rmSync(path, { recursive: true, force: true })
    return
  }

  fs.unlinkSync(path)
}

function filesHaveSameContent(a: string, b: string): boolean {
  const fs = getFsImplementation()
  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    return false
  }

  const aStat = fs.lstatSync(a)
  const bStat = fs.lstatSync(b)

  if (aStat.isSymbolicLink() || bStat.isSymbolicLink()) {
    return (
      aStat.isSymbolicLink() &&
      bStat.isSymbolicLink() &&
      fs.readlinkSync(a) === fs.readlinkSync(b)
    )
  }

  if (!aStat.isFile() || !bStat.isFile() || aStat.size !== bStat.size) {
    return false
  }

  return fs.readFileBytesSync(a).equals(fs.readFileBytesSync(b))
}

function createUniqueConflictPath(path: string): string {
  const fs = getFsImplementation()
  if (!fs.existsSync(path)) {
    return path
  }

  const extension = extname(path)
  const base = extension ? path.slice(0, -extension.length) : path
  let attempt = 1
  while (true) {
    const candidate = `${base}-${attempt}${extension}`
    if (!fs.existsSync(candidate)) {
      return candidate
    }
    attempt++
  }
}

function movePath(sourcePath: string, destinationPath: string): void {
  if (isSamePath(sourcePath, destinationPath)) {
    return
  }

  const fs = getFsImplementation()
  ensureParentDir(destinationPath)

  try {
    fs.renameSync(sourcePath, destinationPath)
    return
  } catch (error) {
    if (getErrnoCode(error) !== 'EXDEV') {
      throw error
    }
  }

  const stat = fs.lstatSync(sourcePath)
  if (stat.isDirectory()) {
    fs.mkdirSync(destinationPath)
    for (const entry of fs.readdirSync(sourcePath)) {
      movePath(
        join(sourcePath, entry.name),
        join(destinationPath, entry.name),
      )
    }
    fs.rmdirSync(sourcePath)
    return
  }

  if (stat.isSymbolicLink()) {
    fs.symlinkSync(fs.readlinkSync(sourcePath), destinationPath)
    fs.unlinkSync(sourcePath)
    return
  }

  fs.copyFileSync(sourcePath, destinationPath)
  fs.unlinkSync(sourcePath)
}

function movePathToConflicts(
  sourcePath: string,
  conflictsRoot: string,
  relativePath: string,
): void {
  const conflictPath = createUniqueConflictPath(join(conflictsRoot, relativePath))
  movePath(sourcePath, conflictPath)
}

function mergeLegacyPath(
  sourcePath: string,
  destinationPath: string,
  conflictsRoot: string,
  relativePath: string,
): void {
  const fs = getFsImplementation()
  if (!fs.existsSync(sourcePath) || isSamePath(sourcePath, destinationPath)) {
    return
  }

  const sourceStat = fs.lstatSync(sourcePath)
  if (!sourceStat.isDirectory()) {
    if (!fs.existsSync(destinationPath)) {
      movePath(sourcePath, destinationPath)
      return
    }

    if (filesHaveSameContent(sourcePath, destinationPath)) {
      removeIfExists(sourcePath)
      return
    }

    movePathToConflicts(sourcePath, conflictsRoot, relativePath)
    return
  }

  if (!fs.existsSync(destinationPath)) {
    movePath(sourcePath, destinationPath)
    return
  }

  const destinationStat = fs.lstatSync(destinationPath)
  if (!destinationStat.isDirectory()) {
    movePathToConflicts(sourcePath, conflictsRoot, relativePath)
    return
  }

  for (const entry of fs.readdirSync(sourcePath)) {
    const nextRelativePath =
      relativePath.length > 0
        ? join(relativePath, entry.name)
        : entry.name
    mergeLegacyPath(
      join(sourcePath, entry.name),
      join(destinationPath, entry.name),
      conflictsRoot,
      nextRelativePath,
    )
  }

  if (fs.existsSync(sourcePath) && fs.isDirEmptySync(sourcePath)) {
    fs.rmdirSync(sourcePath)
  }
}

function getHomeMigrationKey(): string {
  return [
    getAppConfigHomeDir(),
    getDefaultGlobalConfigFile(),
    getConfigDirOverride() ?? '',
    fileSuffixForOauthConfig(),
  ].join('\0')
}

function getDefaultGlobalConfigFile(): string {
  return join(getAppConfigHomeDir(), `.config${fileSuffixForOauthConfig()}.json`)
}

export function getLegacyGlobalConfigFiles(): string[] {
  const suffix = fileSuffixForOauthConfig()
  const configDirOverride = getConfigDirOverride()
  const roots = uniquePaths(
    configDirOverride
      ? [configDirOverride, dirname(getAppConfigHomeDir())]
      : [homedir(), dirname(getAppConfigHomeDir())],
  )

  return uniquePaths(
    roots.flatMap(root => [
      join(root, `.soma${suffix}.json`),
      join(root, `.claude${suffix}.json`),
    ]),
  ).filter(path => !isSamePath(path, getDefaultGlobalConfigFile()))
}

export function getGlobalConfigFileCandidates(): string[] {
  return [getDefaultGlobalConfigFile(), ...getLegacyGlobalConfigFiles()]
}

function getLegacyHomeDirCandidates(): string[] {
  return uniquePaths([
    process.env.CLAUDE_CONFIG_DIR,
    join(homedir(), LEGACY_PROJECT_CONFIG_DIR_NAME),
    join(dirname(getAppConfigHomeDir()), LEGACY_PROJECT_CONFIG_DIR_NAME),
  ]).filter(path => !isSamePath(path, getAppConfigHomeDir()))
}

export function ensureHomeConfigMigration(): void {
  const migrationKey = getHomeMigrationKey()
  if (attemptedHomeMigrations.has(migrationKey)) {
    return
  }
  attemptedHomeMigrations.add(migrationKey)

  const fs = getFsImplementation()
  const targetDir = getAppConfigHomeDir()
  const conflictsRoot = join(targetDir, MIGRATION_CONFLICTS_DIR, 'legacy-home')

  try {
    fs.mkdirSync(targetDir)

    for (const legacyDir of getLegacyHomeDirCandidates()) {
      mergeLegacyPath(legacyDir, targetDir, conflictsRoot, '')
    }

    const globalConfigPath = getDefaultGlobalConfigFile()
    for (const legacyConfigPath of getLegacyGlobalConfigFiles()) {
      mergeLegacyPath(
        legacyConfigPath,
        globalConfigPath,
        join(targetDir, MIGRATION_CONFLICTS_DIR, 'global-config'),
        legacyConfigPath.split('/').pop() ?? 'config.json',
      )
    }
  } catch (error) {
    logForDebugging(
      `[config-paths] home migration failed: ${error instanceof Error ? error.message : String(error)}`,
      { level: 'warn' },
    )
  }
}

function getProjectConfigDirDefault(projectRoot: string): string {
  return join(projectRoot, PROJECT_CONFIG_DIR_NAME)
}

export function getProjectConfigRelativePath(...parts: string[]): string {
  return join(PROJECT_CONFIG_DIR_NAME, ...parts)
}

export function getLegacyProjectConfigRelativePath(...parts: string[]): string {
  return join(LEGACY_PROJECT_CONFIG_DIR_NAME, ...parts)
}

export function getLegacyProjectConfigDir(projectRoot: string): string {
  return join(projectRoot, LEGACY_PROJECT_CONFIG_DIR_NAME)
}

export function ensureProjectConfigMigration(projectRoot: string): string {
  const normalizedRoot = resolve(projectRoot).normalize('NFC')
  if (!migratedProjectRoots.has(normalizedRoot)) {
    migratedProjectRoots.add(normalizedRoot)
    try {
      mergeLegacyPath(
        getLegacyProjectConfigDir(normalizedRoot),
        getProjectConfigDirDefault(normalizedRoot),
        join(
          getProjectConfigDirDefault(normalizedRoot),
          MIGRATION_CONFLICTS_DIR,
          'legacy-project',
        ),
        '',
      )
    } catch (error) {
      logForDebugging(
        `[config-paths] project migration failed for ${normalizedRoot}: ${error instanceof Error ? error.message : String(error)}`,
        { level: 'warn' },
      )
    }
  }

  const defaultDir = getProjectConfigDirDefault(normalizedRoot)
  const legacyDir = getLegacyProjectConfigDir(normalizedRoot)
  const fs = getFsImplementation()

  if (fs.existsSync(defaultDir)) {
    return defaultDir
  }
  if (fs.existsSync(legacyDir)) {
    return legacyDir
  }
  return defaultDir
}

export function getProjectConfigDir(projectRoot: string): string {
  return ensureProjectConfigMigration(projectRoot)
}

export function getProjectConfigPath(
  projectRoot: string,
  ...parts: string[]
): string {
  return join(getProjectConfigDir(projectRoot), ...parts)
}

export function getProjectConfigPathCandidates(
  projectRoot: string,
  ...parts: string[]
): string[] {
  return uniquePaths([
    join(getProjectConfigDirDefault(projectRoot), ...parts),
    join(getLegacyProjectConfigDir(projectRoot), ...parts),
  ])
}
