# Installation

This document covers the end-user installation flow for Soma Code.

## Requirements

- Node.js `>= 18`
- Bun `>= 1.2.23`
- npm `>= 9`

`soma` launches through [bin/soma.js](./bin/soma.js), which starts the CLI with Bun. Bun must be available in `PATH`, or `SOMA_BUN_BIN` must point to the Bun executable.

During `npm install`, Soma no longer downloads Bun in `postinstall`. If Bun is not already available, `soma` can still resolve a local install or auto-download Bun on first run.

If `bun` is not available in `PATH`, you can set:

```bash
export SOMA_BUN_BIN=/path/to/bun
```

## Install dependencies first

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

If Bun is installed but still not in `PATH`, you can set it in the current session:

```powershell
$env:SOMA_BUN_BIN='C:\path\to\bun.exe'
```

### Linux

Install `Node.js >= 18` and `npm >= 9` with your distribution package manager, then install `unzip` and run Bun's official installer:

```bash
sudo apt install -y unzip
curl -fsSL https://bun.com/install | bash
```

If your shell does not pick up Bun automatically, add it to `PATH`:

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

## Option 1: Install directly from GitHub with npm

Recommended:

```bash
npm install -g github:SiChuchen/soma-code
```

Verify after installation:

```bash
soma --help
soma --version
```

Start Soma:

```bash
soma
```

## Option 2: Install locally from a source snapshot

Useful when:

- you cannot install directly from GitHub with npm
- you want to pin a downloaded code snapshot
- you need an offline-distributed package

### Option 2.1: Install from an extracted source archive

1. Download the source archive from the GitHub repository page
2. Extract it and enter the directory
3. Run:

```bash
cd soma-code
npm install -g .
```

### Option 2.2: Install from a `.tgz` package

If you have a packaged npm tarball such as `soma-code-1.0.0.tgz`:

```bash
npm install -g ./soma-code-1.0.0.tgz
```

If you expect a global `soma` command, do not use `npm install .` as a project dependency install inside another repo. Use a global install flow instead.

## Recommended first run

1. Run `soma`
2. Use `/login` for capabilities that require authentication
3. Use `/config` to set API provider, API key, base URL, and default model
4. Use `/model` to inspect the available models

## Update

For GitHub-based installs, you can run:

```bash
soma update
```

## Uninstall

If you installed globally:

```bash
npm uninstall -g soma-code
```

If you installed from a `.tgz` package or from the GitHub repo, it is still an npm global install, so the same uninstall command applies.
