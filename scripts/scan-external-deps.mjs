import {
  buildExternalDependencyCounts,
  collectProjectImports,
  sortCountEntries,
} from './_lib/import-analysis.mjs'

const { sourceFiles, importRecords } = await collectProjectImports()

const dependencyCounts = sortCountEntries(
  buildExternalDependencyCounts(importRecords),
)

const totalReferences = dependencyCounts.reduce((sum, [, count]) => sum + count, 0)

console.log(`Analyzed ${sourceFiles.length} source files`)
console.log(
  `Found ${dependencyCounts.length} external dependency candidates (${totalReferences} total references)`,
)

for (const [packageName, count] of dependencyCounts) {
  console.log(`${String(count).padStart(5)}  ${packageName}`)
}
