process.env.CLAUDE_CODE_ENTRYPOINT ??= 'cli'

const packageJson = await Bun.file(new URL('../package.json', import.meta.url)).json()

const macroValues = {
  VERSION: packageJson.version ?? '1.0.0',
  PACKAGE_NAME: packageJson.name ?? 'soma-code',
  BUILD_TIME: '',
  PACKAGE_URL:
    'https://github.com/SiChuchen/soma-code/archive/refs/heads/master.tar.gz',
  NATIVE_PACKAGE_URL: null,
  FEEDBACK_CHANNEL: 'GitHub Issues: https://github.com/SiChuchen/soma-code/issues',
  ISSUES_EXPLAINER:
    'open an issue at https://github.com/SiChuchen/soma-code/issues',
  VERSION_CHANGELOG: '',
  GITHUB_REPOSITORY: 'SiChuchen/soma-code',
  GITHUB_DEFAULT_BRANCH: 'master',
  GITHUB_REPOSITORY_URL: 'https://github.com/SiChuchen/soma-code',
  GITHUB_ISSUES_URL: 'https://github.com/SiChuchen/soma-code/issues',
}

globalThis.eval(
  `var MACRO = new Proxy(${JSON.stringify(
    macroValues,
  )}, { get: (target, prop) => prop in target ? target[prop] : '' });`,
)

process.argv = ['bun', 'src/entrypoints/cli.tsx', ...process.argv.slice(2)]

await import('../src/entrypoints/cli.tsx')
