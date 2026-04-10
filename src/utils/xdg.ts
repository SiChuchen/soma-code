/**
 * XDG Base Directory utilities for Claude CLI Native Installer
 *
 * Implements the XDG Base Directory specification for organizing
 * native installer components across appropriate system directories.
 *
 * @see https://specifications.freedesktop.org/basedir-spec/latest/
 */

import { homedir as osHomedir } from 'os'
import { join } from 'path'

type EnvLike = Record<string, string | undefined>

type XDGOptions = {
  env?: EnvLike
  homedir?: string
}

export const XDG_APP_DIR_NAME = 'soma'
export const LEGACY_XDG_APP_DIR_NAME = 'claude'

function resolveOptions(options?: XDGOptions): { env: EnvLike; home: string } {
  return {
    env: options?.env ?? process.env,
    home: options?.homedir ?? process.env.HOME ?? osHomedir(),
  }
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths))
}

/**
 * Get XDG state home directory
 * Default: ~/.local/state
 * @param options Optional env and homedir overrides for testing
 */
export function getXDGStateHome(options?: XDGOptions): string {
  const { env, home } = resolveOptions(options)
  return env.XDG_STATE_HOME ?? join(home, '.local', 'state')
}

/**
 * Get XDG cache home directory
 * Default: ~/.cache
 * @param options Optional env and homedir overrides for testing
 */
export function getXDGCacheHome(options?: XDGOptions): string {
  const { env, home } = resolveOptions(options)
  return env.XDG_CACHE_HOME ?? join(home, '.cache')
}

/**
 * Get XDG data home directory
 * Default: ~/.local/share
 * @param options Optional env and homedir overrides for testing
 */
export function getXDGDataHome(options?: XDGOptions): string {
  const { env, home } = resolveOptions(options)
  return env.XDG_DATA_HOME ?? join(home, '.local', 'share')
}

/**
 * Get user bin directory (not technically XDG but follows the convention)
 * Default: ~/.local/bin
 * @param options Optional homedir override for testing
 */
export function getUserBinDir(options?: XDGOptions): string {
  const { home } = resolveOptions(options)
  return join(home, '.local', 'bin')
}

export function getAppXDGDataDir(options?: XDGOptions): string {
  return join(getXDGDataHome(options), XDG_APP_DIR_NAME)
}

export function getLegacyAppXDGDataDir(options?: XDGOptions): string {
  return join(getXDGDataHome(options), LEGACY_XDG_APP_DIR_NAME)
}

export function getAppXDGDataDirCandidates(options?: XDGOptions): string[] {
  return uniquePaths([
    getAppXDGDataDir(options),
    getLegacyAppXDGDataDir(options),
  ])
}

export function getAppXDGCacheDir(options?: XDGOptions): string {
  return join(getXDGCacheHome(options), XDG_APP_DIR_NAME)
}

export function getLegacyAppXDGCacheDir(options?: XDGOptions): string {
  return join(getXDGCacheHome(options), LEGACY_XDG_APP_DIR_NAME)
}

export function getAppXDGCacheDirCandidates(options?: XDGOptions): string[] {
  return uniquePaths([
    getAppXDGCacheDir(options),
    getLegacyAppXDGCacheDir(options),
  ])
}

export function getAppXDGStateDir(options?: XDGOptions): string {
  return join(getXDGStateHome(options), XDG_APP_DIR_NAME)
}

export function getLegacyAppXDGStateDir(options?: XDGOptions): string {
  return join(getXDGStateHome(options), LEGACY_XDG_APP_DIR_NAME)
}

export function getAppXDGStateDirCandidates(options?: XDGOptions): string[] {
  return uniquePaths([
    getAppXDGStateDir(options),
    getLegacyAppXDGStateDir(options),
  ])
}
