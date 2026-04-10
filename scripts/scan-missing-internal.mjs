import {
  buildMissingInternalCounts,
  collectProjectImports,
  sortCountEntries,
} from './_lib/import-analysis.mjs'

const { sourceFiles, importRecords, existingInternalTargets } =
  await collectProjectImports()

const missingInternalCounts = sortCountEntries(
  buildMissingInternalCounts(importRecords, existingInternalTargets),
)

const totalReferences = missingInternalCounts.reduce(
  (sum, [, count]) => sum + count,
  0,
)

console.log(`Analyzed ${sourceFiles.length} source files`)
console.log(
  `Found ${missingInternalCounts.length} missing internal targets (${totalReferences} total references)`,
)

for (const [target, count] of missingInternalCounts) {
  console.log(`${String(count).padStart(5)}  ${target}`)
}
