import { builtinModules } from 'node:module'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const builtinModuleSet = new Set(
  builtinModules.flatMap(moduleName =>
    moduleName.startsWith('node:')
      ? [moduleName, moduleName.slice(5)]
      : [moduleName, `node:${moduleName}`],
  ),
)

const thisFile = fileURLToPath(import.meta.url)
const thisDir = path.dirname(thisFile)

export const projectRoot = path.resolve(thisDir, '..', '..')

function normalizePath(value) {
  return value.replaceAll(path.sep, '/').replace(/\/+/g, '/')
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

async function walkFiles(rootDir, currentDir, output, predicate) {
  const entries = await readdir(currentDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.cache') {
      continue
    }

    const absolutePath = path.join(currentDir, entry.name)
    const relativePath = normalizePath(path.relative(rootDir, absolutePath))

    if (entry.isDirectory()) {
      await walkFiles(rootDir, absolutePath, output, predicate)
      continue
    }

    if (entry.isFile() && predicate(relativePath)) {
      output.push(relativePath)
    }
  }
}

async function walkSourceFiles(rootDir, currentDir, output) {
  await walkFiles(rootDir, currentDir, output, isSourceFile)
}

async function walkImportableAssets(rootDir, currentDir, output) {
  await walkFiles(rootDir, currentDir, output, isImportableAsset)
}

function extractImportSpecifiers(source) {
  const matches = []
  const pattern =
    /(?:import\s+(?:type\s+)?(?:[^'"`]*?\s+from\s*)?['"]([^'"]+)['"]|export\s+(?:type\s+)?(?:[^'"`]*?\s+from\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\))/g

  for (const match of source.matchAll(pattern)) {
    const specifier = match[1] || match[2] || match[3] || match[4]
    if (specifier) {
      matches.push(specifier)
    }
  }

  return matches
}

function isBareSpecifier(specifier) {
  return (
    !specifier.startsWith('./') &&
    !specifier.startsWith('../') &&
    !specifier.startsWith('/') &&
    !/^[A-Za-z]:[\\/]/.test(specifier)
  )
}

function normalizeSpecifier(specifier) {
  return normalizePath(specifier.split('?')[0]?.split('#')[0] || specifier)
}

function packageNameFromSpecifier(specifier) {
  const cleaned = normalizeSpecifier(specifier)
  const segments = cleaned.split('/')

  if (cleaned.startsWith('@')) {
    return segments.slice(0, 2).join('/')
  }

  return segments[0] || cleaned
}

function resolveInternalTarget(fromFile, specifier) {
  const cleaned = normalizeSpecifier(specifier)

  if (cleaned.startsWith('src/') || cleaned.startsWith('vendor/')) {
    return stripKnownExtension(cleaned)
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

  return stripKnownExtension(resolved)
}

function isLikelyPackageSpecifier(specifier) {
  return (
    !specifier.includes('://') &&
    !specifier.includes(' ') &&
    !specifier.includes('=') &&
    !specifier.endsWith('.node') &&
    /^[@A-Za-z0-9][@A-Za-z0-9._/-]*$/.test(specifier)
  )
}

export async function collectProjectImports(rootDir = projectRoot) {
  const sourceFiles = []
  const existingInternalTargets = new Set()

  for (const dirName of ['src', 'vendor']) {
    const absoluteDir = path.join(rootDir, dirName)
    await walkSourceFiles(rootDir, absoluteDir, sourceFiles)
  }

  sourceFiles.sort()

  for (const relativePath of sourceFiles) {
    const withoutExtension = stripKnownExtension(relativePath)
    existingInternalTargets.add(withoutExtension)

    if (path.basename(withoutExtension) === 'index') {
      existingInternalTargets.add(normalizePath(path.dirname(withoutExtension)))
    }
  }

  for (const dirName of ['src', 'vendor']) {
    const absoluteDir = path.join(rootDir, dirName)
    const allFiles = []
    await walkImportableAssets(rootDir, absoluteDir, allFiles)

    for (const relativePath of allFiles) {
      if (!isImportableAsset(relativePath)) {
        continue
      }

      existingInternalTargets.add(relativePath)
    }
  }

  const importRecords = []
  for (const relativePath of sourceFiles) {
    const absolutePath = path.join(rootDir, relativePath)
    const source = await readFile(absolutePath, 'utf8')
    const specifiers = extractImportSpecifiers(source)

    for (const specifier of specifiers) {
      importRecords.push({
        file: relativePath,
        specifier: normalizeSpecifier(specifier),
      })
    }
  }

  return {
    sourceFiles,
    importRecords,
    existingInternalTargets,
  }
}

export function buildMissingInternalCounts(importRecords, existingInternalTargets) {
  const missingCounts = new Map()

  for (const record of importRecords) {
    const normalizedTarget = resolveInternalTarget(record.file, record.specifier)
    if (!normalizedTarget) {
      continue
    }

    if (existingInternalTargets.has(normalizedTarget)) {
      continue
    }

    missingCounts.set(
      normalizedTarget,
      (missingCounts.get(normalizedTarget) || 0) + 1,
    )
  }

  return missingCounts
}

export function buildExternalDependencyCounts(importRecords) {
  const dependencyCounts = new Map()

  for (const record of importRecords) {
    const specifier = record.specifier

    if (!isBareSpecifier(specifier)) {
      continue
    }

    if (specifier.startsWith('src/') || specifier.startsWith('vendor/')) {
      continue
    }

    if (specifier.startsWith('bun:')) {
      continue
    }

    if (!isLikelyPackageSpecifier(specifier)) {
      continue
    }

    if (builtinModuleSet.has(specifier)) {
      continue
    }

    const packageName = packageNameFromSpecifier(specifier)
    dependencyCounts.set(
      packageName,
      (dependencyCounts.get(packageName) || 0) + 1,
    )
  }

  return dependencyCounts
}

export function sortCountEntries(counts) {
  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1]
    }

    return left[0].localeCompare(right[0])
  })
}
