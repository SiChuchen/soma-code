import { describe, expect, test } from 'bun:test'
import { homedir } from 'os'
import { join } from 'path'
import { getGlobalClaudeFile } from './env.js'
import { getAppConfigHomeDir } from './envUtils.js'

function resetPathCaches(): void {
  getAppConfigHomeDir.cache.clear?.()
  getGlobalClaudeFile.cache.clear?.()
}

function restoreEnv(
  originalSomaConfigDir: string | undefined,
  originalClaudeConfigDir: string | undefined,
): void {
  if (originalSomaConfigDir === undefined) {
    delete process.env.SOMA_CONFIG_DIR
  } else {
    process.env.SOMA_CONFIG_DIR = originalSomaConfigDir
  }

  if (originalClaudeConfigDir === undefined) {
    delete process.env.CLAUDE_CONFIG_DIR
  } else {
    process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir
  }

  resetPathCaches()
}

describe('environment path defaults', () => {
  test('defaults app config home dir to ~/.soma', () => {
    const originalSomaConfigDir = process.env.SOMA_CONFIG_DIR
    const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR

    try {
      delete process.env.SOMA_CONFIG_DIR
      delete process.env.CLAUDE_CONFIG_DIR
      resetPathCaches()

      expect(getAppConfigHomeDir()).toBe(join(homedir(), '.soma'))
    } finally {
      restoreEnv(originalSomaConfigDir, originalClaudeConfigDir)
    }
  })

  test('prefers SOMA_CONFIG_DIR for global config paths', () => {
    const originalSomaConfigDir = process.env.SOMA_CONFIG_DIR
    const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR

    try {
      process.env.SOMA_CONFIG_DIR = '/tmp/soma-config'
      process.env.CLAUDE_CONFIG_DIR = '/tmp/legacy-claude-config'
      resetPathCaches()

      expect(getAppConfigHomeDir()).toBe('/tmp/soma-config')
      expect(getGlobalClaudeFile()).toBe('/tmp/soma-config/.config.json')
    } finally {
      restoreEnv(originalSomaConfigDir, originalClaudeConfigDir)
    }
  })
})
