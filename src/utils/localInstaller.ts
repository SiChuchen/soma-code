/**
 * Utilities for handling local installation
 */

import { access, chmod, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  CLI_COMMAND_ALIASES,
  CLI_COMMAND_NAME,
  LEGACY_CLI_COMMAND_NAME,
  LEGACY_CLI_COMMAND_ALIASES,
} from '../constants/cliName.js'
import { type ReleaseChannel, saveGlobalConfig } from './config.js'
import { getAppConfigHomeDir } from './envUtils.js'
import { getErrnoCode } from './errors.js'
import { execFileNoThrowWithCwd } from './execFileNoThrow.js'
import { getFsImplementation } from './fsOperations.js'
import { logError } from './log.js'
import { jsonStringify } from './slowOperations.js'
import { getPackageInstallTarget } from './distribution.js'

// Lazy getters: getAppConfigHomeDir() is memoized and reads process.env.
// Evaluating at module scope would capture the value before entrypoints like
// hfi.tsx get a chance to set CLAUDE_CONFIG_DIR in main(), and would also
// populate the memoize cache with that stale value for all 150+ other callers.
function getLocalInstallDir(): string {
  return join(getAppConfigHomeDir(), 'local')
}

export function getLocalCommandPath(commandName: string): string {
  return join(getLocalInstallDir(), commandName)
}

export function getLocalClaudePath(): string {
  return getLocalCommandPath(CLI_COMMAND_NAME)
}

export function getLegacyLocalClaudePath(): string {
  return getLocalCommandPath(LEGACY_CLI_COMMAND_NAME)
}

export function getLocalCommandPaths(): string[] {
  return CLI_COMMAND_ALIASES.map(getLocalCommandPath)
}

export function getLegacyLocalCommandPaths(): string[] {
  return LEGACY_CLI_COMMAND_ALIASES.map(getLocalCommandPath)
}

/**
 * Check if we're running from our managed local installation
 */
export function isRunningFromLocalInstallation(): boolean {
  const execPath = process.argv[1] || ''
  return (
    execPath.includes('/.soma/local/node_modules/') ||
    execPath.includes('/.claude/local/node_modules/')
  )
}

/**
 * Write `content` to `path` only if the file does not already exist.
 * Uses O_EXCL ('wx') for atomic create-if-missing.
 */
async function writeIfMissing(
  path: string,
  content: string,
  mode?: number,
): Promise<boolean> {
  try {
    await writeFile(path, content, { encoding: 'utf8', flag: 'wx', mode })
    return true
  } catch (e) {
    if (getErrnoCode(e) === 'EEXIST') return false
    throw e
  }
}

/**
 * Ensure the local package environment is set up
 * Creates the directory, package.json, and wrapper script
 */
export async function ensureLocalPackageEnvironment(): Promise<boolean> {
  try {
    const localInstallDir = getLocalInstallDir()

    // Create installation directory (recursive, idempotent)
    await getFsImplementation().mkdir(localInstallDir)

    // Create package.json if it doesn't exist
    await writeIfMissing(
      join(localInstallDir, 'package.json'),
      jsonStringify(
        { name: 'soma-local', version: '0.0.1', private: true },
        null,
        2,
      ),
    )

    for (const commandName of CLI_COMMAND_ALIASES) {
      const wrapperPath = getLocalCommandPath(commandName)
      const created = await writeIfMissing(
        wrapperPath,
        `#!/bin/sh\nexec "${localInstallDir}/node_modules/.bin/${commandName}" "$@"`,
        0o755,
      )
      if (created) {
        // Mode in writeFile is masked by umask; chmod to ensure executable bit.
        await chmod(wrapperPath, 0o755)
      }
    }

    for (const commandName of LEGACY_CLI_COMMAND_ALIASES) {
      try {
        await unlink(getLocalCommandPath(commandName))
      } catch (error) {
        if (getErrnoCode(error) !== 'ENOENT') {
          throw error
        }
      }
    }

    return true
  } catch (error) {
    logError(error)
    return false
  }
}

/**
 * Install or update Claude CLI package in the local directory
 * @param channel - Release channel to use (latest or stable)
 * @param specificVersion - Optional specific version to install (overrides channel)
 */
export async function installOrUpdateClaudePackage(
  channel: ReleaseChannel,
  specificVersion?: string | null,
): Promise<'in_progress' | 'success' | 'install_failed'> {
  try {
    // First ensure the environment is set up
    if (!(await ensureLocalPackageEnvironment())) {
      return 'install_failed'
    }

    // Use specific version if provided, otherwise use channel tag
    const versionSpec = specificVersion
      ? specificVersion
      : channel === 'stable'
        ? 'stable'
        : 'latest'
    const result = await execFileNoThrowWithCwd(
      'npm',
      ['install', getPackageInstallTarget(versionSpec)],
      { cwd: getLocalInstallDir(), maxBuffer: 1000000 },
    )

    if (result.code !== 0) {
      const error = new Error(
        `Failed to install ${CLI_COMMAND_NAME} CLI package: ${result.stderr}`,
      )
      logError(error)
      return result.code === 190 ? 'in_progress' : 'install_failed'
    }

    // Set installMethod to 'local' to prevent npm permission warnings
    saveGlobalConfig(current => ({
      ...current,
      installMethod: 'local',
    }))

    return 'success'
  } catch (error) {
    logError(error)
    return 'install_failed'
  }
}

/**
 * Check if local installation exists.
 * Pure existence probe — callers use this to choose update path / UI hints.
 */
export async function localInstallationExists(): Promise<boolean> {
  for (const commandName of CLI_COMMAND_ALIASES) {
    try {
      await access(join(getLocalInstallDir(), 'node_modules', '.bin', commandName))
      return true
    } catch {
      // Try the next supported command name.
    }
  }
  return false
}

/**
 * Get shell type to determine appropriate path setup
 */
export function getShellType(): string {
  const shellPath = process.env.SHELL || ''
  if (shellPath.includes('zsh')) return 'zsh'
  if (shellPath.includes('bash')) return 'bash'
  if (shellPath.includes('fish')) return 'fish'
  return 'unknown'
}
