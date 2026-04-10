# Soma Code

[中文文档](./README.zh-CN.md)

The soma code prototype was refactored from a top-tier open-source project.

Soma Code is a terminal-first AI coding CLI designed for working directly inside local projects. It helps you understand repositories, edit code, configure model providers, and run day-to-day development workflows from the command line.

Public repository:

- GitHub: `https://github.com/SiChuchen/soma-code`

## Project Positioning

Soma Code is not just a chat interface in a terminal. It is intended to be a practical coding agent CLI that can:

- understand the current working directory and project context
- configure models, providers, and authentication interactively
- read and write local files as part of development workflows
- support both user-level and project-level configuration
- work with multiple provider styles instead of being tied to a single vendor

## Core Capabilities

- Interactive AI coding assistant in the terminal
- Unified provider and API configuration through `/config`
- Login-oriented flows through `/login`
- Model inspection and switching through `/model`
- Support for OpenAI-compatible providers
- User configuration stored under `~/.soma`
- Project configuration stored under `.soma/`
- Compatibility layers for legacy remote and migration workflows

## Install

If Bun is not available yet, install it first or let `soma` resolve/download Bun on first run.

See [INSTALL.md](./INSTALL.md) for the supported installation flows.

## Feature Guide

### OpenAI-compatible access

Soma can connect to providers that expose OpenAI-style APIs.

How to use:

- Open `/config`
- Choose a provider or custom provider entry that uses `OpenAI-compatible` routing
- Set the provider `Base URL`
- Set the provider `API key`
- Set the upstream `Provider model`
- Only change `API key header`, `API auth scheme`, or `Disable auth` if the upstream provider docs explicitly require it

Notes:

- `/config` already includes an OpenAI-compatible configuration dialog and provider compatibility handling
- Supported OpenAI-compatible profiles include local/authless gateways and hosted services such as Azure OpenAI, Ollama, LM Studio, Moonshot/Kimi, Qianfan, Hunyuan, iFlytek, and ChatGPT-style routing
- For most gateways, the base URL is the provider root, commonly ending in `/v1`

### Anthropic-compatible access

Soma also supports endpoints that speak Anthropic-compatible protocol semantics.

How to use:

- Open `/config`
- Add or select a connection that uses `Anthropic-compatible`
- Set the target base URL and model required by that provider
- Use it like any other configured model route through `/model` or the default model settings

Notes:

- The inference registry exposes `Anthropic-compatible` as a first-class connection type
- Anthropic-compatible and OpenAI-compatible routing are handled as separate compatibility modes

### OpenAI auth / ChatGPT-style access

In addition to raw API keys, soma includes a ChatGPT OAuth-based access path.

How to use:

- Open `/config`
- Go to the relevant provider/connection entry
- Start the ChatGPT auth flow when offered
- After authorization completes, use the routed model normally

Notes:

- `/config` integrates `startChatGPTOAuth`, `getChatGPTOAuthData`, and `revokeChatGPTAuth`
- The inference client injects the required OAuth headers for ChatGPT-backed OpenAI-compatible requests

### Dream

`/dream` starts a background memory-consolidation run.

How to use:

- Run `/dream`
- Soma starts dream in the background
- Open `/tasks` to watch progress

Notes:

- If there are no newer sessions since the last consolidation, dream will review the existing memory files directly
- Dream depends on auto-memory being enabled

### Public Mode

Public Mode is the current public/private presentation control entrypoint.

How to use:

- `/public-mode`
- `/public-mode status`
- `/public-mode on`
- `/public-mode off`
- `/public-mode auto`
- `/public-mode default on`
- `/public-mode default off`
- `/public-mode default auto`
- `/public-mode default clear`

Notes:

- `/undercover` is kept as a compatibility alias and loads the same implementation
- The UI already renders this as `public mode`
- Older Anti-Distillation wording is no longer the main user-facing entrypoint; Public Mode is the current supported mechanism

### Coordinator Mode

Coordinator Mode lets new sessions in the current project start in coordinator mode.

How to use:

- `/coordinator`
- `/coordinator status`
- `/coordinator on`
- `/coordinator off`
- `/coordinator default on`
- `/coordinator default off`
- `/coordinator default clear`

Notes:

- Project-scoped changes affect new sessions for the current repo
- User defaults affect future sessions globally
- The current session is not retroactively changed by stored defaults

### Local autoDream

Soma includes local auto-dream support for automatic memory consolidation.

How to use:

- Open the memory UI / selector
- Toggle `Auto-dream: on`
- You can still run `/dream` manually at any time

Notes:

- Auto-dream only makes sense when auto-memory is enabled
- The memory selector already shows auto-dream status and suggests `/dream` when it is enabled but idle
- Auto-dream is skipped in remote mode and when KAIROS mode is active

### KAIROS

KAIROS is a feature-gated assistant/proactive capability inside soma.

How to use:

- Use a build or environment where the `KAIROS` feature gate is enabled
- When enabled, soma can expose KAIROS-related assistant, proactive, and brief flows

Notes:

- KAIROS is integrated at startup and command registration time
- Related gates such as `KAIROS_BRIEF` and `KAIROS_GITHUB_WEBHOOKS` also exist in the codebase
- Some KAIROS capabilities depend on entitlement or runtime gating rather than a single always-visible slash command

### BUDDY

BUDDY is a lightweight built-in companion system.

How to use:

- `/buddy`
- `/buddy hatch`
- `/buddy pet`
- `/buddy status`
- `/buddy mute`
- `/buddy unmute`
- `/buddy help`

Behavior:

- If you do not have a buddy yet, `/buddy` hatches one
- If you already have one, `/buddy` pets it

### WebBrowser

Soma includes a built-in WebBrowser tool path for browser-page inspection and interaction.

How to use:

- Enable the browser tool feature gate, or set `CLAUDE_CODE_ENABLE_WEB_BROWSER_TOOL`
- Then let the agent use the `WebBrowser` tool when browser interaction is needed

Supported actions in the current schema:

- `navigate`
- `snapshot`
- `click`
- `type`
- `wait`
- `evaluate`
- `screenshot`
- `console`
- `network`
- `close`

Notes:

- The tool is intended for local dev servers, screenshots, console inspection, network inspection, and lightweight page interaction
- In this snapshot, the browser tool shell and schema are present, but the code also includes an unavailable-message path if no browser backend is wired in yet

## Typical Use Cases

- understanding an unfamiliar codebase
- editing or refactoring an existing project
- debugging API/provider/model configuration
- keeping project-scoped settings alongside a repository
- driving development tasks directly from the terminal

## Requirements

- Node.js `>= 18`
- Bun `>= 1.2.23`
- npm `>= 9`

`soma` starts through [bin/soma.js](./bin/soma.js), which launches the CLI with Bun. The launcher first checks `SOMA_BUN_BIN` / `CLAUDE_CODE_BUN_BIN`, then `PATH`, then bundled fallback locations.

## Install Dependencies

### Windows

Install Node.js LTS and Bun:

```powershell
winget install --id OpenJS.NodeJS.LTS -e --source winget
winget install --id Oven-sh.Bun -e --source winget
```

Open a new terminal, then verify:

```powershell
node -v
npm -v
bun --version
```

If Bun is installed but still not available in `PATH`, set `SOMA_BUN_BIN` to either the full `bun.exe` path or the directory that contains it before running `soma`.

### Linux

Install `Node.js >= 18` and `npm >= 9` with your distribution's package manager, then install `unzip` because Bun's official installer requires it:

```bash
sudo apt install -y unzip
curl -fsSL https://bun.com/install | bash
```

If your shell does not load Bun automatically, add it to `PATH`:

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

Then verify:

```bash
node -v
npm -v
bun --version
```

## Install Soma

The `soma` installation command is the same on Windows and Linux after the dependencies above are ready.

### Option 1: Install from the npm registry

Preferred public distribution path once `soma-code` is published:

```bash
npm install -g soma-code
```

### Option 2: Install from a packaged `.tgz` release artifact

Preferred fallback before npm publication or when you want a tarball-based install path.

If you want the latest repository snapshot without GitHub git shorthand:

```bash
npm install -g https://github.com/SiChuchen/soma-code/archive/refs/heads/master.tar.gz
```

If you want a pinned packaged artifact:

```bash
npm install -g ./soma-code-1.0.3.tgz
```

On minimal Linux images where you want to skip optional native image tooling during install:

```bash
npm install -g --omit=optional ./soma-code-1.0.3.tgz
```

After installation:

```bash
soma --help
soma --version
soma
```

Additional command aliases:

```bash
somacode --help
soma-code --help
```

### Option 3: Local source installation

This path is intended for contributors and local debugging, not for end-user installs.

If you already have the source code checked out locally, install from the local directory:

```bash
cd soma-code
npm install -g .
```

Do not use `npm install .` if you expect a global `soma` command. That installs the package as a dependency in the current project, but does not expose the CLI globally.

### Not recommended

Avoid:

```bash
npm install -g github:SiChuchen/soma-code
```

npm treats GitHub shorthand as a git dependency. Because this repository defines a `build` script, npm can enter a git dependency preparation flow during install, which is more fragile than installing a registry package or a packaged tarball artifact.

For more installation details, see [INSTALL.md](./INSTALL.md).

### Troubleshooting `npm ERR! spawn sh ENOENT`

This npm error often shows up when npm is forced into source-build preparation for a git dependency and the target machine cannot launch `sh` for lifecycle or build steps. It is not a `soma` runtime failure.

Check:

```bash
command -v sh
echo "$PATH"
npm config get script-shell
```

If `script-shell` points to a missing path, reset it:

```bash
npm config delete script-shell
```

If you are on a minimal Linux image, also make sure `PATH` includes `/bin` and `/usr/bin`. Prefer installing a packaged tarball instead of `github:` source shorthand, and keep `--omit=optional` if you want to skip optional native addons during install.

## Quick Start

Recommended first-run flow:

1. Start `soma`
2. Use `/login` for capabilities that require authentication
3. Use `/config` to configure API provider, API key, base URL, and default model
4. Use `/model` to inspect the currently configured models
5. Start working directly inside your project directory

For OpenAI-compatible providers, you can configure the provider from `/config` or use the corresponding runtime environment variables supported by your deployment.

## Common Commands

- `soma`
  Start an interactive session
- `soma --help`
  Show CLI help
- `soma --version`
  Show the current version
- `soma update`
  Check for and install updates
- `/login`
  Handle login-oriented capabilities
- `/config`
  Manage API and runtime configuration
- `/model`
  Manage currently available models

## Configuration Model

Soma Code uses a layered configuration system:

- user-level config: `~/.soma`
- project-level config: `.soma/`

This makes it easier to:

- reuse personal defaults across projects
- keep repository-specific settings separate
- preserve team conventions inside the project itself

The project still retains parts of the migration and compatibility behavior for older paths and entrypoints, but the default namespace is now `soma`.

## Repository Structure

Main directories:

- `src/`
  Core TypeScript source code
- `bin/`
  CLI launcher entrypoints
- `scripts/`
  Development and source-runner scripts
- `vendor/`
  Vendored dependencies and wrappers
- `types/`
  Global and helper type definitions

If you are contributing, the most important areas are usually:

- `src/entrypoints/`
  CLI and runtime entrypoints
- `src/commands/`
  Commands and interactive entry flows
- `src/components/`
  Ink UI components
- `src/services/`
  API, MCP, analytics, and sync/service logic
- `src/tools/`
  Model-facing tools
- `src/utils/`
  Shared runtime, configuration, and utility logic

## Development

Install dependencies:

```bash
npm install
```

Common commands:

```bash
bun run typecheck
bun run build
bun test
```

The source entrypoint is still available for development and debugging:

```bash
bun scripts/run-source-cli.mjs --help
```

## Compatibility Notes

- The primary command name is `soma`
- `somacode` and `soma-code` can be exposed as additional command aliases in user-facing documentation and packaging
- Local and project configuration defaults have moved to the `soma` namespace
- Some remote-related implementations remain for compatibility with legacy workflows

## License

This project is licensed under the [MIT License](./LICENSE).

You are free to use, modify, distribute, and use this project commercially, as long as the original copyright notice and license text are retained.
