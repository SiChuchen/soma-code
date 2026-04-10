export type CachedMCConfig = {
  enabled: boolean
  triggerThreshold: number
  keepRecent: number
  supportedModels: string[]
  systemPromptSuggestSummaries: boolean
}

const DEFAULT_CACHED_MC_CONFIG: CachedMCConfig = {
  enabled: false,
  triggerThreshold: 12,
  keepRecent: 5,
  supportedModels: [
    'claude-opus-4',
    'claude-sonnet-4',
    'claude-haiku-4',
  ],
  systemPromptSuggestSummaries: false,
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined
  }

  return parsed
}

function isEnvTruthy(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function getCachedMCConfig(): CachedMCConfig {
  const triggerThreshold =
    parsePositiveInt(process.env.CLAUDE_CODE_CACHED_MC_TRIGGER) ??
    DEFAULT_CACHED_MC_CONFIG.triggerThreshold
  const keepRecent =
    parsePositiveInt(process.env.CLAUDE_CODE_CACHED_MC_KEEP_RECENT) ??
    DEFAULT_CACHED_MC_CONFIG.keepRecent
  const supportedModels =
    process.env.CLAUDE_CODE_CACHED_MC_MODELS?.split(',')
      .map((part: string) => part.trim())
      .filter(Boolean) ?? DEFAULT_CACHED_MC_CONFIG.supportedModels

  return {
    enabled:
      process.env.USER_TYPE === 'ant' &&
      isEnvTruthy(process.env.CLAUDE_ENABLE_CACHED_MICROCOMPACT) &&
      !isEnvTruthy(process.env.DISABLE_COMPACT),
    triggerThreshold,
    keepRecent: Math.max(1, keepRecent),
    supportedModels,
    systemPromptSuggestSummaries: isEnvTruthy(
      process.env.CLAUDE_CODE_CACHED_MC_SYSTEM_PROMPT_HINT,
    ),
  }
}
