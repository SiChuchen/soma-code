// Content for the verify bundled skill.
// The extracted snapshot only contains recovered placeholder markdown, so we
// inline it here to keep the tsc-built dist self-contained.

export const SKILL_MD = `---
description: Verify a code change does what it should by running the app.
---

# Verify

This recovered placeholder keeps the bundled \`verify\` skill loadable in the
extracted snapshot.

The original verify skill instructions were not present in the local source
extraction.
`

export const SKILL_FILES: Record<string, string> = {
  'examples/cli.md': `# Verify CLI Example

Recovered placeholder for the bundled \`verify\` skill.

The original CLI example page was not present in this extracted snapshot.
`,
  'examples/server.md': `# Verify Server Example

Recovered placeholder for the bundled \`verify\` skill.

The original server example page was not present in this extracted snapshot.
`,
}
