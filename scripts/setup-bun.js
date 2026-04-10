#!/usr/bin/env node

/**
 * Postinstall script — downloads bun to project-local vendor/bun/ directory.
 *
 * This ensures `soma` can always start even if:
 *   - bun is not in PATH
 *   - auto-download at runtime fails (network / firewall)
 *
 * The downloaded binary is gitignored and per-platform.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BUN_VERSION = '1.2.23'
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const vendorDir = path.join(repoRoot, 'vendor', 'bun')

function hasUsableCwd() {
  try {
    process.cwd()
    return true
  } catch {
    return false
  }
}

if (!hasUsableCwd()) {
  try {
    process.chdir(repoRoot)
  } catch {
    console.warn(
      '[soma:postinstall] Skipping bun setup because npm invoked postinstall with an invalid working directory.',
    )
    console.warn(
      '[soma:postinstall] Install Bun manually or let soma resolve/download Bun at first run.',
    )
    process.exit(0)
  }
}

// Platform detection
function getPlatformInfo() {
  const platform = process.platform
  const arch = process.arch

  let target, exeName
  if (platform === 'win32') {
    const suffix = arch === 'x64' ? 'x64' : arch === 'arm64' ? 'aarch64' : null
    if (!suffix) return null
    target = `bun-windows-${suffix}`
    exeName = 'bun.exe'
  } else if (platform === 'darwin') {
    const suffix = arch === 'arm64' ? 'aarch64' : 'x64'
    target = `bun-darwin-${suffix}`
    exeName = 'bun'
  } else if (platform === 'linux') {
    const suffix = arch === 'arm64' ? 'aarch64' : 'x64'
    target = `bun-linux-${suffix}`
    exeName = 'bun'
  } else {
    return null
  }

  return {
    url: `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${target}.zip`,
    exeName,
  }
}

// Check if vendor bun already exists and matches version
function isVendorBunReady(exeName) {
  const bunPath = path.join(vendorDir, exeName)
  if (!existsSync(bunPath)) return false

  const versionFile = path.join(vendorDir, '.version')
  if (existsSync(versionFile)) {
    const version = readFileSync(versionFile, 'utf8').trim()
    if (version === BUN_VERSION) return true
  }

  return false
}

function downloadAndExtract(url, exeName) {
  mkdirSync(vendorDir, { recursive: true })

  const zipPath = path.join(vendorDir, `bun-${BUN_VERSION}.zip`)

  console.log(`[soma:postinstall] Downloading bun v${BUN_VERSION} to vendor/bun/ ...`)

  try {
    if (process.platform === 'win32') {
      const ps = `
        $ErrorActionPreference = 'Stop'
        Invoke-WebRequest -Uri '${url}' -OutFile '${zipPath}' -UseBasicParsing
        Expand-Archive -Path '${zipPath}' -DestinationPath '${vendorDir}' -Force
        $nested = Get-ChildItem -Path '${vendorDir}' -Filter '${exeName}' -Recurse | Select-Object -First 1
        if ($nested -and $nested.FullName -ne '${path.join(vendorDir, exeName)}') {
          Move-Item -Path $nested.FullName -Destination '${path.join(vendorDir, exeName)}' -Force
        }
        Remove-Item -Path '${zipPath}' -Force -ErrorAction SilentlyContinue
      `.trim()
      execSync(`powershell.exe -NoProfile -Command "${ps.replace(/\n/g, ' ')}"`, {
        stdio: 'inherit',
        timeout: 180_000,
      })
    } else {
      execSync(`curl -fsSL '${url}' -o '${zipPath}'`, {
        stdio: 'inherit',
        timeout: 180_000,
      })
      execSync(`unzip -o -q '${zipPath}' -d '${vendorDir}'`, { stdio: 'inherit' })
      for (const entry of readdirSync(vendorDir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name.startsWith('bun-')) {
          const nested = path.join(vendorDir, entry.name, exeName)
          if (existsSync(nested)) {
            renameSync(nested, path.join(vendorDir, exeName))
          }
        }
      }
      try {
        unlinkSync(zipPath)
      } catch {
        // ignore
      }
    }

    writeFileSync(path.join(vendorDir, '.version'), BUN_VERSION)
    console.log(`[soma:postinstall] bun v${BUN_VERSION} ready at vendor/bun/${exeName}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[soma:postinstall] Failed to download bun: ${message}`)
    console.warn(
      '[soma:postinstall] soma will attempt auto-download at first run, or set SOMA_BUN_BIN manually.',
    )
  }
}

const info = getPlatformInfo()
if (!info) {
  console.warn(
    `[soma:postinstall] Unsupported platform: ${process.platform}-${process.arch}, skipping bun download.`,
  )
  process.exit(0)
}

const { url, exeName } = info

if (isVendorBunReady(exeName)) {
  console.log(
    `[soma:postinstall] vendor/bun/${exeName} (v${BUN_VERSION}) already exists, skipping download.`,
  )
  process.exit(0)
}

downloadAndExtract(url, exeName)
