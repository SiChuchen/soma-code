import { describe, expect, test } from 'bun:test'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  ensureHomeConfigMigration,
  getProjectConfigPath,
} from './configPaths.js'
import { getGlobalClaudeFile } from './env.js'
import { getAppConfigHomeDir } from './envUtils.js'

function resetPathCaches(): void {
  getAppConfigHomeDir.cache.clear?.()
  getGlobalClaudeFile.cache.clear?.()
}

describe('config path migration', () => {
  test('migrates legacy project .claude contents into .soma', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'soma-project-'))
    try {
      mkdirSync(join(projectRoot, '.claude', 'skills', 'review'), {
        recursive: true,
      })
      writeFileSync(
        join(projectRoot, '.claude', 'settings.json'),
        '{"theme":"dark"}\n',
        { encoding: 'utf8' },
      )
      writeFileSync(
        join(projectRoot, '.claude', 'skills', 'review', 'SKILL.md'),
        '# Review\n',
        { encoding: 'utf8' },
      )

      const settingsPath = getProjectConfigPath(projectRoot, 'settings.json')
      const skillPath = getProjectConfigPath(
        projectRoot,
        'skills',
        'review',
        'SKILL.md',
      )

      expect(settingsPath).toBe(join(projectRoot, '.soma', 'settings.json'))
      expect(skillPath).toBe(
        join(projectRoot, '.soma', 'skills', 'review', 'SKILL.md'),
      )
      expect(existsSync(settingsPath)).toBe(true)
      expect(existsSync(skillPath)).toBe(true)
      expect(existsSync(join(projectRoot, '.claude'))).toBe(false)
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  test('migrates legacy home config into ~/.soma', () => {
    const root = mkdtempSync(join(tmpdir(), 'soma-home-'))
    const originalSomaConfigDir = process.env.SOMA_CONFIG_DIR
    const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR

    try {
      process.env.SOMA_CONFIG_DIR = join(root, '.soma')
      delete process.env.CLAUDE_CONFIG_DIR
      resetPathCaches()

      mkdirSync(join(root, '.claude'), { recursive: true })
      writeFileSync(join(root, '.claude', 'settings.json'), '{"theme":"light"}\n', {
        encoding: 'utf8',
      })
      writeFileSync(join(root, '.claude.json'), '{"numStartups":1}\n', {
        encoding: 'utf8',
      })

      ensureHomeConfigMigration()
      resetPathCaches()

      expect(getAppConfigHomeDir()).toBe(join(root, '.soma'))
      expect(getGlobalClaudeFile()).toBe(join(root, '.soma', '.config.json'))
      expect(existsSync(join(root, '.soma', 'settings.json'))).toBe(true)
      expect(
        readFileSync(join(root, '.soma', '.config.json'), 'utf8'),
      ).toContain('"numStartups":1')
    } finally {
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
      rmSync(root, { recursive: true, force: true })
    }
  })
})
