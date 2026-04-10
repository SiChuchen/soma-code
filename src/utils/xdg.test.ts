import { describe, expect, test } from 'bun:test'
import { join } from 'path'
import {
  getAppXDGCacheDir,
  getAppXDGCacheDirCandidates,
  getAppXDGDataDir,
  getAppXDGDataDirCandidates,
  getAppXDGStateDir,
  getAppXDGStateDirCandidates,
  getLegacyAppXDGCacheDir,
  getLegacyAppXDGDataDir,
  getLegacyAppXDGStateDir,
} from './xdg.js'

describe('xdg app directories', () => {
  test('defaults app-scoped XDG directories to soma paths', () => {
    const options = {
      env: {},
      homedir: '/tmp/soma-home',
    }

    expect(getAppXDGDataDir(options)).toBe(
      join('/tmp/soma-home', '.local', 'share', 'soma'),
    )
    expect(getAppXDGCacheDir(options)).toBe(
      join('/tmp/soma-home', '.cache', 'soma'),
    )
    expect(getAppXDGStateDir(options)).toBe(
      join('/tmp/soma-home', '.local', 'state', 'soma'),
    )
  })

  test('exposes legacy claude directories as compatibility candidates', () => {
    const options = {
      env: {},
      homedir: '/tmp/soma-home',
    }

    expect(getLegacyAppXDGDataDir(options)).toBe(
      join('/tmp/soma-home', '.local', 'share', 'claude'),
    )
    expect(getLegacyAppXDGCacheDir(options)).toBe(
      join('/tmp/soma-home', '.cache', 'claude'),
    )
    expect(getLegacyAppXDGStateDir(options)).toBe(
      join('/tmp/soma-home', '.local', 'state', 'claude'),
    )
    expect(getAppXDGDataDirCandidates(options)).toEqual([
      join('/tmp/soma-home', '.local', 'share', 'soma'),
      join('/tmp/soma-home', '.local', 'share', 'claude'),
    ])
    expect(getAppXDGCacheDirCandidates(options)).toEqual([
      join('/tmp/soma-home', '.cache', 'soma'),
      join('/tmp/soma-home', '.cache', 'claude'),
    ])
    expect(getAppXDGStateDirCandidates(options)).toEqual([
      join('/tmp/soma-home', '.local', 'state', 'soma'),
      join('/tmp/soma-home', '.local', 'state', 'claude'),
    ])
  })

  test('respects explicit XDG environment overrides', () => {
    const options = {
      env: {
        XDG_DATA_HOME: '/xdg/data',
        XDG_CACHE_HOME: '/xdg/cache',
        XDG_STATE_HOME: '/xdg/state',
      },
      homedir: '/tmp/ignored-home',
    }

    expect(getAppXDGDataDir(options)).toBe('/xdg/data/soma')
    expect(getAppXDGCacheDir(options)).toBe('/xdg/cache/soma')
    expect(getAppXDGStateDir(options)).toBe('/xdg/state/soma')
  })
})
