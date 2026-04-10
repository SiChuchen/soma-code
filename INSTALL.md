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

## Option 1: Install from the npm registry

Preferred public distribution path once `soma-code` is published:

```bash
npm install -g soma-code
```

## Option 2: Install from a packaged `.tgz` release artifact

Useful when:

- the npm package is not published yet
- you want to pin an exact packaged artifact
- you need an offline-distributed package

If you want the latest repository snapshot without GitHub git shorthand:

```bash
npm install -g https://github.com/SiChuchen/soma-code/archive/refs/heads/master.tar.gz
```

If you have a packaged npm tarball such as `soma-code-1.0.3.tgz`:

```bash
npm install -g ./soma-code-1.0.3.tgz
```

On minimal Linux images where you want to skip optional native image tooling during install:

```bash
npm install -g --omit=optional ./soma-code-1.0.3.tgz
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

## Option 3: Install from a local source checkout

This path is intended for contributors and local debugging, not for end-user installs.

```bash
cd soma-code
npm install -g .
```

If you expect a global `soma` command, do not use `npm install .` as a project dependency install inside another repo. Use a global install flow instead.

## Not Recommended

Avoid:

```bash
npm install -g github:SiChuchen/soma-code
```

npm treats GitHub shorthand as a git dependency. Because this repository defines a `build` script, npm can enter a git dependency preparation flow during install, which is more fragile than installing a registry package or a packaged tarball artifact.

## Troubleshooting

### `npm ERR! spawn sh ENOENT`

This error often shows up when npm is forced into source-build preparation for a git dependency and cannot launch `sh` for lifecycle or build steps. It is not a `soma` runtime crash.

On Linux, check:

```bash
command -v sh
echo "$PATH"
npm config get script-shell
```

If `npm config get script-shell` prints a missing path, reset it:

```bash
npm config delete script-shell
```

If your image has an incomplete `PATH`, make sure it includes standard shell locations such as `/bin` and `/usr/bin`.

If you are installing from a packaged tarball on a minimal image, prefer:

```bash
npm install -g --omit=optional ./soma-code-1.0.3.tgz
```

## Recommended first run

1. Run `soma`
2. Use `/login` for capabilities that require authentication
3. Use `/config` to set API provider, API key, base URL, and default model
4. Use `/model` to inspect the available models

## Update

For npm registry installs:

```bash
npm install -g soma-code@latest
```

For `.tgz` installs, install a newer release artifact. `soma update` may still help depending on the distribution you originally installed from.

## Uninstall

If you installed globally:

```bash
npm uninstall -g soma-code
```

If you installed from a `.tgz` package or from the GitHub repo, it is still an npm global install, so the same uninstall command applies.
