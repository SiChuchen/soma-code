import { describe, expect, test } from 'bun:test'
import {
  extractGitHubRepositoryFromSpec,
  getKnownPackageNames,
  getPackageInstallTargetFromSpec,
  isGitHubInstallSpec,
} from './distribution.js'

describe('distribution helpers', () => {
  test('detects GitHub install specs across supported formats', () => {
    expect(isGitHubInstallSpec('github:SiChuchen/soma-code')).toBe(true)
    expect(
      isGitHubInstallSpec(
        'https://github.com/SiChuchen/soma-code/archive/refs/heads/master.tar.gz',
      ),
    ).toBe(true)
    expect(
      isGitHubInstallSpec(
        'https://codeload.github.com/SiChuchen/soma-code/tar.gz/refs/heads/master',
      ),
    ).toBe(true)
    expect(
      extractGitHubRepositoryFromSpec(
        'git+https://github.com/SiChuchen/soma-code.git',
      ),
    ).toBe('SiChuchen/soma-code')
    expect(
      extractGitHubRepositoryFromSpec('git@github.com:SiChuchen/soma-code.git'),
    ).toBe('SiChuchen/soma-code')
  })

  test('builds npm install targets with explicit versions for registry packages', () => {
    expect(
      getPackageInstallTargetFromSpec('soma-code', '1.2.3'),
    ).toBe('soma-code@1.2.3')
    expect(
      getPackageInstallTargetFromSpec('@scope/soma-code', 'latest'),
    ).toBe('@scope/soma-code@latest')
  })

  test('keeps GitHub install targets on repository source instead of npm tags', () => {
    expect(
      getPackageInstallTargetFromSpec('github:SiChuchen/soma-code', '1.2.3'),
    ).toBe('github:SiChuchen/soma-code')
    expect(
      getPackageInstallTargetFromSpec(
        'https://github.com/SiChuchen/soma-code/archive/refs/heads/master.tar.gz',
        '1.2.3',
      ),
    ).toBe(
      'https://github.com/SiChuchen/soma-code/archive/refs/heads/master.tar.gz',
    )
  })

  test('tracks both legacy and current package names for diagnostics', () => {
    expect(getKnownPackageNames()).toContain('@anthropic-ai/claude-code')
    expect(getKnownPackageNames()).toContain('soma-code')
  })
})
