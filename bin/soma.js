#!/usr/bin/env node

import { spawn, execSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const currentDir = path.dirname(currentFile)
const repoRoot = path.resolve(currentDir, '..')
const runnerPath = path.join(repoRoot, 'scripts', 'run-source-cli.mjs')
const BUN_VERSION = '1.2.23'
const bunExe = process.platform === 'win32' ? 'bun.exe' : 'bun'

function normalizeConfiguredPath(value) {
  return value.trim().replace(/^"(.*)"$/, '$1')
}

function resolveBunCandidate(candidate) {
  if (!candidate) return null

  const normalized = normalizeConfiguredPath(candidate)
  if (!normalized) return null

  let isDirectory = false
  try {
    isDirectory = statSync(normalized).isDirectory()
  } catch {
    // Ignore resolution failures and continue trying derived paths.
  }

  if (isDirectory) {
    const nestedExecutable = path.join(normalized, bunExe)
    return existsSync(nestedExecutable) ? nestedExecutable : null
  }

  const variants = new Set([normalized])

  if (path.basename(normalized).toLowerCase() !== bunExe.toLowerCase()) {
    variants.add(path.join(normalized, bunExe))
  }

  if (process.platform === 'win32' && !normalized.toLowerCase().endsWith('.exe')) {
    variants.add(`${normalized}.exe`)
  }

  for (const variant of variants) {
    if (existsSync(variant)) return variant
  }

  return null
}

function findBunOnPath() {
  try {
    const lookupCommand = process.platform === 'win32' ? 'where.exe bun' : 'which bun'
    const output = execSync(lookupCommand, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()

    for (const line of output.split(/\r?\n/)) {
      const resolved = resolveBunCandidate(line)
      if (resolved) return resolved
    }
  } catch {
    // Ignore PATH lookup failures and continue with built-in fallbacks.
  }

  return null
}

function findBunInWinGetPackages(packagesDir) {
  const preferredSubdirs =
    process.arch === 'arm64'
      ? ['bun-windows-aarch64', 'bun-windows-x64']
      : ['bun-windows-x64', 'bun-windows-aarch64']

  try {
    for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('Oven-sh.Bun')) continue

      const packageDir = path.join(packagesDir, entry.name)
      for (const subdir of preferredSubdirs) {
        const candidate = path.join(packageDir, subdir, bunExe)
        if (existsSync(candidate)) return candidate
      }

      for (const child of readdirSync(packageDir, { withFileTypes: true })) {
        if (!child.isDirectory()) continue
        const candidate = path.join(packageDir, child.name, bunExe)
        if (existsSync(candidate)) return candidate
      }
    }
  } catch {
    // Ignore inaccessible WinGet directories and continue searching.
  }

  return null
}

function formatBunResolutionError(checked, error, bunPath = null) {
  const lines = [`[soma] Unable to resolve Bun >= ${BUN_VERSION}.`]

  if (bunPath) {
    lines.push(`[soma] Last Bun candidate: ${bunPath}`)
  }

  if (checked.length > 0) {
    lines.push('[soma] Checked:')
    for (const candidate of checked) {
      lines.push(`  - ${candidate}`)
    }
  }

  if (error instanceof Error) {
    lines.push(`[soma] Last error: ${error.message}`)
  }

  lines.push('[soma] Fix one of these and retry:')
  lines.push(`  - add Bun to PATH so \`${bunExe}\` can be resolved`)
  lines.push(`  - set SOMA_BUN_BIN to the full path of ${bunExe}`)
  lines.push(`  - or set SOMA_BUN_BIN to the directory that contains ${bunExe}`)
  lines.push('  - CLAUDE_CODE_BUN_BIN is also supported')

  return lines.join('\n')
}

function findBun() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || ''
  const localAppData =
    process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local')
  const checked = []

  const configuredCandidates = [
    ['SOMA_BUN_BIN', process.env.SOMA_BUN_BIN],
    ['CLAUDE_CODE_BUN_BIN', process.env.CLAUDE_CODE_BUN_BIN],
  ]

  for (const [name, value] of configuredCandidates) {
    if (!value) continue
    checked.push(`${name}: ${value}`)
    const resolved = resolveBunCandidate(value)
    if (resolved) return { bunBin: resolved, checked }
  }

  checked.push('PATH: bun')
  const bunOnPath = findBunOnPath()
  if (bunOnPath) return { bunBin: bunOnPath, checked }

  const candidates = [
    ['Soma-managed install', path.join(homeDir, '.soma', 'bun')],
    ['Project vendor Bun', path.join(repoRoot, 'vendor', 'bun')],
    [
      'WinGet packages',
      localAppData
        ? path.join(localAppData, 'Microsoft', 'WinGet', 'Packages')
        : null,
    ],
    ['Default Bun install', path.join(homeDir, '.bun', 'bin')],
    ['Scoop shims', path.join(homeDir, 'scoop', 'shims')],
  ]

  for (const [label, candidate] of candidates) {
    if (!candidate) continue
    checked.push(`${label}: ${candidate}`)
    const resolved =
      label === 'WinGet packages'
        ? findBunInWinGetPackages(candidate)
        : resolveBunCandidate(candidate)
    if (resolved) return { bunBin: resolved, checked }
  }

  return { bunBin: null, checked }
}

function getBunInstallInfo() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || ''
  const installDir = path.join(homeDir, '.soma', 'bun')
  const platform = process.platform
  const arch = process.arch

  let url
  if (platform === 'win32') {
    const suffix = arch === 'x64' ? 'x64' : arch === 'arm64' ? 'aarch64' : null
    if (!suffix) return null
    url = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-windows-${suffix}.zip`
  } else if (platform === 'darwin') {
    const suffix = arch === 'arm64' ? 'aarch64' : 'x64'
    url = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-darwin-${suffix}.zip`
  } else {
    const suffix = arch === 'arm64' ? 'aarch64' : 'x64'
    url = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${suffix}.zip`
  }

  return { url, installDir, exeName: bunExe }
}

function downloadAndExtractBun() {
  const info = getBunInstallInfo()
  if (!info) {
    throw new Error(`Unsupported platform: ${process.platform}-${process.arch}`)
  }

  const { url, installDir, exeName } = info
  const bunPath = path.join(installDir, exeName)

  if (existsSync(bunPath)) return bunPath

  console.log(`[soma] Bun not found. Downloading bun v${BUN_VERSION}...`)

  mkdirSync(installDir, { recursive: true })

  const zipPath = path.join(installDir, `bun-${BUN_VERSION}.zip`)

  try {
    if (process.platform === 'win32') {
      const ps = `
        $ErrorActionPreference = 'Stop'
        Invoke-WebRequest -Uri '${url}' -OutFile '${zipPath}' -UseBasicParsing
        Expand-Archive -Path '${zipPath}' -DestinationPath '${installDir}' -Force
        $nested = Get-ChildItem -Path '${installDir}' -Filter '${exeName}' -Recurse | Select-Object -First 1
        if ($nested -and $nested.FullName -ne '${bunPath}') {
          Move-Item -Path $nested.FullName -Destination '${bunPath}' -Force
        }
        Remove-Item -Path '${zipPath}' -Force
      `
      execSync(
        `powershell.exe -NoProfile -Command "${ps.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
        {
          stdio: 'inherit',
          timeout: 120_000,
        },
      )
    } else {
      execSync(`curl -fsSL '${url}' -o '${zipPath}'`, {
        stdio: 'inherit',
        timeout: 120_000,
      })
      execSync(`unzip -o -q '${zipPath}' -d '${installDir}'`, {
        stdio: 'inherit',
      })
      try {
        for (const entry of readdirSync(installDir, { withFileTypes: true })) {
          if (!entry.isDirectory() || !entry.name.startsWith('bun-')) continue
          const nested = path.join(installDir, entry.name, exeName)
          if (existsSync(nested)) {
            renameSync(nested, bunPath)
          }
        }
      } catch {
        // Best-effort cleanup.
      }
      try {
        unlinkSync(zipPath)
      } catch {
        // Ignore cleanup failures.
      }
    }
  } catch (err) {
    throw new Error(
      `[soma] Failed to download bun: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!existsSync(bunPath)) {
    throw new Error(`[soma] bun installation failed - binary not found at ${bunPath}`)
  }

  console.log(`[soma] bun v${BUN_VERSION} installed to ${bunPath}`)
  return bunPath
}

const bunResolution = findBun()
let bunBin = bunResolution.bunBin
let bunResolutionError = null

if (!bunBin) {
  try {
    bunBin = downloadAndExtractBun()
  } catch (error) {
    bunResolutionError = error
  }
}

if (!bunBin) {
  console.error(
    formatBunResolutionError(bunResolution.checked, bunResolutionError),
  )
  process.exit(1)
}

if (!existsSync(runnerPath)) {
  console.error(`soma CLI runner not found: ${runnerPath}`)
  process.exit(1)
}

const child = spawn(bunBin, [runnerPath, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DISABLE_ERROR_REPORTING: process.env.DISABLE_ERROR_REPORTING ?? '1',
    DISABLE_TELEMETRY: process.env.DISABLE_TELEMETRY ?? '1',
  },
  stdio: 'inherit',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal)
    }
  })
}

child.on('error', error => {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'EACCES')
  ) {
    console.error(
      formatBunResolutionError(bunResolution.checked, error, bunBin),
    )
    process.exit(1)
  }

  console.error(
    `Failed to start soma CLI: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1)
  }

  process.exit(code ?? 0)
})

