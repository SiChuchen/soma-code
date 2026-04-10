import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { projectRoot, sortCountEntries } from './_lib/import-analysis.mjs'

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
])

const IMPORTABLE_ASSET_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.json',
  '.node',
  '.wasm',
  '.sql',
  '.graphql',
  '.gql',
])

const REQUIRED_TRACKED_PATHS = [
  'package.json',
  'bin/soma.js',
  'bin/soma-code.js',
  'bin/somacode.js',
  'scripts/run-source-cli.mjs',
]

function normalizePath(value) {
  return value.replaceAll(path.sep, '/').replace(/\/+/g, '/')
}

function normalizeInternalTarget(value) {
  const normalized = normalizePath(value)
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

function stripKnownExtension(specifier) {
  const ext = path.extname(specifier)
  return SOURCE_EXTENSIONS.has(ext) ? specifier.slice(0, -ext.length) : specifier
}

function isSourceFile(relativePath) {
  return SOURCE_EXTENSIONS.has(path.extname(relativePath))
}

function isImportableAsset(relativePath) {
  return IMPORTABLE_ASSET_EXTENSIONS.has(path.extname(relativePath))
}

function extractImportSpecifiers(source) {
  const matches = []
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^\\:])\/\/.*$/gm, '$1')
  const pattern =
    /(?:import\s+(?:type\s+)?(?:[^'"`]*?\s+from\s*)?['"]([^'"]+)['"]|export\s+(?:type\s+)?(?:[^'"`]*?\s+from\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\))/g

  for (const match of withoutComments.matchAll(pattern)) {
    const specifier = match[1] || match[2] || match[3] || match[4]
    if (specifier) {
      matches.push(specifier)
    }
  }

  return matches
}

function normalizeSpecifier(specifier) {
  return normalizePath(specifier.split('?')[0]?.split('#')[0] || specifier)
}

function resolveInternalTarget(fromFile, specifier) {
  const cleaned = normalizeSpecifier(specifier)

  if (cleaned.startsWith('src/') || cleaned.startsWith('vendor/')) {
    return normalizeInternalTarget(stripKnownExtension(cleaned))
  }

  if (!cleaned.startsWith('./') && !cleaned.startsWith('../')) {
    return null
  }

  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromFile), cleaned),
  )

  if (!resolved.startsWith('src/') && !resolved.startsWith('vendor/')) {
    return null
  }

  return normalizeInternalTarget(stripKnownExtension(resolved))
}

function addInternalTarget(targets, relativePath) {
  if (isSourceFile(relativePath)) {
    const withoutExtension = stripKnownExtension(relativePath)
    targets.add(withoutExtension)

    if (path.posix.basename(withoutExtension) === 'index') {
      targets.add(normalizePath(path.posix.dirname(withoutExtension)))
    }

    return
  }

  if (isImportableAsset(relativePath)) {
    targets.add(relativePath)
  }
}

async function walkFiles(rootDir, currentDir, output) {
  const entries = await readdir(currentDir, { withFileTypes: true })

  for (const entry of entries) {
    if (
      entry.name === '.git' ||
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === '.cache'
    ) {
      continue
    }

    const absolutePath = path.join(currentDir, entry.name)
    const relativePath = normalizePath(path.relative(rootDir, absolutePath))

    if (entry.isDirectory()) {
      await walkFiles(rootDir, absolutePath, output)
      continue
    }

    if (entry.isFile()) {
      output.push(relativePath)
    }
  }
}

function readUInt32BE(bytes, offset) {
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  )
}

async function readTrackedPathsFromIndex(rootDir = projectRoot) {
  const indexPath = path.join(rootDir, '.git', 'index')
  const bytes = await readFile(indexPath)

  if (bytes.subarray(0, 4).toString('ascii') !== 'DIRC') {
    throw new Error(`Unsupported git index format at ${indexPath}`)
  }

  const entryCount = readUInt32BE(bytes, 8)
  const trackedPaths = new Set()
  let offset = 12

  for (let index = 0; index < entryCount; index++) {
    const nameStart = offset + 62
    let nameEnd = nameStart

    while (nameEnd < bytes.length - 20 && bytes[nameEnd] !== 0) {
      nameEnd++
    }

    if (nameEnd >= bytes.length - 20) {
      throw new Error(`Failed to parse git index entry ${index}`)
    }

    trackedPaths.add(bytes.subarray(nameStart, nameEnd).toString('utf8'))

    const entryLength = nameEnd - offset + 1
    const padding = (8 - (entryLength % 8)) % 8
    offset = nameEnd + 1 + padding
  }

  return trackedPaths
}

const trackedPaths = await readTrackedPathsFromIndex()
const trackedInternalTargets = new Set()

for (const trackedPath of trackedPaths) {
  if (!trackedPath.startsWith('src/') && !trackedPath.startsWith('vendor/')) {
    continue
  }

  addInternalTarget(trackedInternalTargets, trackedPath)
}

const onDiskFiles = []
for (const rootName of ['src', 'vendor']) {
  await walkFiles(projectRoot, path.join(projectRoot, rootName), onDiskFiles)
}

const onDiskInternalTargets = new Set()
for (const relativePath of onDiskFiles) {
  addInternalTarget(onDiskInternalTargets, relativePath)
}

const missingRequiredTrackedPaths = REQUIRED_TRACKED_PATHS.filter(
  requiredPath => !trackedPaths.has(requiredPath),
)

const trackedSourceFiles = [...trackedPaths]
  .filter(
    relativePath =>
      (relativePath.startsWith('src/') || relativePath.startsWith('vendor/')) &&
      isSourceFile(relativePath),
  )
  .sort()

const missingInternalCounts = new Map()
const untrackedInternalCounts = new Map()

for (const relativePath of trackedSourceFiles) {
  const absolutePath = path.join(projectRoot, relativePath)
  const source = await readFile(absolutePath, 'utf8')
  const specifiers = extractImportSpecifiers(source)

  for (const specifier of specifiers) {
    const target = resolveInternalTarget(relativePath, specifier)
    if (!target || trackedInternalTargets.has(target)) {
      continue
    }

    if (onDiskInternalTargets.has(target)) {
      untrackedInternalCounts.set(
        target,
        (untrackedInternalCounts.get(target) || 0) + 1,
      )
      continue
    }

    missingInternalCounts.set(target, (missingInternalCounts.get(target) || 0) + 1)
  }
}

const missingInternalEntries = sortCountEntries(missingInternalCounts)
const untrackedInternalEntries = sortCountEntries(untrackedInternalCounts)

console.log(`Tracked source files: ${trackedSourceFiles.length}`)
console.log(`Missing internal targets: ${missingInternalEntries.length}`)
console.log(`Untracked internal targets: ${untrackedInternalEntries.length}`)

if (missingRequiredTrackedPaths.length > 0) {
  console.log('')
  console.log('Missing tracked release paths:')
  for (const relativePath of missingRequiredTrackedPaths) {
    console.log(`  - ${relativePath}`)
  }
}

if (untrackedInternalEntries.length > 0) {
  console.log('')
  console.log('Tracked files that import on-disk but untracked internal targets:')
  for (const [target, count] of untrackedInternalEntries) {
    console.log(`  ${String(count).padStart(5)}  ${target}`)
  }
}

if (missingInternalEntries.length > 0) {
  console.log('')
  console.log('Tracked files that import missing internal targets:')
  for (const [target, count] of missingInternalEntries) {
    console.log(`  ${String(count).padStart(5)}  ${target}`)
  }
}

if (
  missingRequiredTrackedPaths.length > 0 ||
  missingInternalEntries.length > 0 ||
  untrackedInternalEntries.length > 0
) {
  console.error('')
  console.error('Release tracking verification failed.')
  console.error('Ensure runtime files are committed before packaging or publishing.')
  process.exitCode = 1
}
