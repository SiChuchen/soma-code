# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Soma Code is a terminal-first AI coding CLI (`soma-code`). It is a TypeScript ESM project using Ink (React for CLI) for the UI, Bun as the runtime/package manager, and a custom state store. It supports multiple AI provider backends (Anthropic, OpenAI-compatible, ChatGPT OAuth) through a layered inference routing system.

## Build & Development Commands

```bash
bun run typecheck              # TypeScript type checking (tsc -p tsconfig.check.json)
bun run build                  # Build to dist/ (tsc -p tsconfig.build.json)
bun test                       # Run all tests
bun test src/path/to/file.test.ts  # Run a single test file
bun scripts/run-source-cli.mjs --help  # Run CLI from source (dev mode)
```

Linting uses **Biome**. Test files are co-located with source as `*.test.ts` or `*.test.tsx`.

## Code Style

- **Indentation**: 2 spaces, no tabs
- **Quotes**: Single quotes for strings, backticks for templates
- **Semicolons**: Omitted (ASI)
- **Trailing commas**: Yes
- **Imports**: ESM with `.js` extensions in TypeScript source (`import { x } from '../utils/array.js'`)
- **Import order**: React/compiler-runtime → external packages → internal absolute (`src/`) → relative → type imports, with blank lines between groups
- **Biome**: Use `// biome-ignore` comments when needed

## Architecture

### Entry Flow
`bin/soma.js` (Node launcher) → resolves Bun → spawns `scripts/run-source-cli.mjs` → `src/entrypoints/cli.tsx` → `src/main.tsx` (Ink TUI). The init path runs through `src/entrypoints/init.ts` for config, telemetry, OAuth, proxy setup.

### Key Modules
- **`src/QueryEngine.ts`** (~47KB): Core agent loop — processes queries, manages API calls, tool use, permissions, streaming.
- **`src/Tool.ts`** (~30KB): Abstract Tool interface. ~45+ tool implementations in `src/tools/`, registered in `src/tools.ts`.
- **`src/commands.ts`**: ~80+ slash commands, each in `src/commands/<name>/` with `index.ts` + UI file.
- **`src/components/`**: ~150+ Ink (React) UI components.
- **`src/hooks/`**: ~100+ React hooks.

### State Management
Custom store in `src/state/` — `store.ts` (createStore, Zustand-like), `AppStateStore.ts` (typed state), `AppState.tsx` (React context provider), `selectors.ts`.

### Inference Layer (`src/utils/inference/`)
Multi-provider routing: `registry.ts` (provider registry) → `router.ts` (request routing) → `clientFactory.ts` (API clients) → `credentials.ts` (credential resolution) → `modelPicker.ts` (model selection) → `resolve.ts` (model name resolution).

### Feature Gating
`feature('FLAG_NAME')` from `bun:bundle` enables compile-time dead-code elimination. Key flags: `KAIROS`, `DAEMON`, `BRIDGE_MODE`, `BG_SESSIONS`, `VOICE_MODE`. Tools and commands are conditionally loaded.

### Vendored Dependencies
`vendor/` contains native NAPI modules, protobufjs, MCP builder, and sandbox runtime. Modify with extreme caution.

## Adding New Code

- **New command**: Create `src/commands/<name>/index.ts` exporting a Command object, implement UI in a `.tsx` file, register in `src/commands.ts`.
- **New component**: Place in `src/components/` with PascalCase naming. Use Ink primitives (`Box`, `Text`) from `src/ink/`.
- **New tool**: Implement the Tool interface from `src/Tool.ts`, register in `src/tools.ts`.
- **New utility**: Place in appropriate `src/utils/` subdirectory.

## Commit Messages

Use short imperative subjects scoped by area:
```
mcp: normalize server names
bridge: guard worktree setup
commands: add validation for /add-dir path
components: fix spinner alignment in brief mode
```

## Snapshot Caveats

Some `.tsx` files contain React Compiler output (`_c` calls) and inline source maps. Preserve these sections and keep edits minimal. Do not broad-reformat files with compiler output.
