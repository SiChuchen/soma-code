export const CLI_COMMAND_NAME = 'soma'
export const CLI_COMMAND_COMPAT_NAMES = ['somacode', 'soma-code'] as const
export const LEGACY_CLI_COMMAND_NAME = 'claude'
export const LEGACY_CLI_COMMAND_ALIASES = [
  LEGACY_CLI_COMMAND_NAME,
  'claude-code',
] as const
export const CLI_COMMAND_ALIASES = [
  CLI_COMMAND_NAME,
  ...CLI_COMMAND_COMPAT_NAMES,
] as const
