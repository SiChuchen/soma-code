import { access } from 'node:fs/promises'
import path from 'node:path'
import {
  buildExternalDependencyCounts,
  buildMissingInternalCounts,
  collectProjectImports,
  projectRoot,
} from './_lib/import-analysis.mjs'

const requiredPaths = [
  'package.json',
  'README.md',
  'bin/soma.js',
  'bin/somacode.js',
  'bin/soma-code.js',
  'tsconfig.json',
  'tsconfig.check.json',
  'tsconfig.build.json',
  'bunfig.toml',
  '.gitignore',
  'types/ambient-modules.d.ts',
  'types/bun-runtime.d.ts',
  'types/native-modules.d.ts',
  'scripts/scan-missing-internal.mjs',
  'scripts/scan-external-deps.mjs',
  'scripts/verify-snapshot.mjs',
  'scripts/run-source-cli.mjs',
  'src',
  'vendor',
  'plan',
  '../claude-code-v-2.1.88/package/package.json',
  '../claude-code-v-2.1.88/package/cli.js',
  '../claude-code-v-2.1.88/package/cli.js.map',
  '../claude-code-v-2.1.88/package/sdk-tools.d.ts',
]

async function exists(relativePath) {
  try {
    await access(path.resolve(projectRoot, relativePath))
    return true
  } catch {
    return false
  }
}

const missingPaths = []

for (const relativePath of requiredPaths) {
  const present = await exists(relativePath)
  console.log(`${present ? '[ok]' : '[missing]'} ${relativePath}`)
  if (!present) {
    missingPaths.push(relativePath)
  }
}

const { sourceFiles, importRecords, existingInternalTargets } =
  await collectProjectImports()

const missingInternalCounts = buildMissingInternalCounts(
  importRecords,
  existingInternalTargets,
)
const dependencyCounts = buildExternalDependencyCounts(importRecords)

console.log('')
console.log(`Source files: ${sourceFiles.length}`)
console.log(`Missing internal targets: ${missingInternalCounts.size}`)
console.log(`External dependency candidates: ${dependencyCounts.size}`)

if (missingPaths.length > 0) {
  console.error('')
  console.error(`Snapshot verification failed: ${missingPaths.length} required paths are missing`)
  process.exitCode = 1
}
