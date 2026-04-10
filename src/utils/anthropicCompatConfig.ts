export type AnthropicCompatProfile =
  | 'deepseek'
  | 'glm'
  | 'hunyuan-anthropic'
  | 'kimi'
  | 'minimax'
  | 'qianfan-anthropic'
  | 'qwen'
  | 'stepfun'
  | 'tencent-plan'
  | 'xfyun'

export type AnthropicCompatUiProfile = AnthropicCompatProfile | 'manual'

export type AnthropicCompatProfileDefaults = {
  apiTimeoutMs?: string
  baseUrl?: string
  enableToolSearch?: boolean
  model?: string
  subagentModel?: string
}

export type AnthropicCompatConfig = {
  apiKey?: string
  baseUrl?: string
  effectiveBaseUrl?: string
  effectiveModel?: string
  model?: string
  profile: AnthropicCompatUiProfile
}

export const ANTHROPIC_COMPAT_PROFILE_LABELS: Record<
  AnthropicCompatUiProfile,
  string
> = {
  deepseek: 'DeepSeek',
  glm: 'Zhipu GLM',
  'hunyuan-anthropic': 'Tencent Hunyuan',
  kimi: 'Moonshot / Kimi',
  manual: 'Manual',
  minimax: 'MiniMax',
  'qianfan-anthropic': 'Baidu Qianfan',
  qwen: 'Qwen / DashScope',
  stepfun: 'StepFun',
  'tencent-plan': 'Tencent Token Plan',
  xfyun: 'iFlytek Coding Plan',
}

function trimEnvValue(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function normalizeAnthropicCompatProfile(
  profile: string | undefined | null,
): AnthropicCompatProfile | undefined {
  switch (profile?.trim().toLowerCase()) {
    case 'minimax':
      return 'minimax'
    case 'glm':
    case 'zhipu':
    case 'bigmodel':
      return 'glm'
    case 'kimi':
    case 'moonshot':
      return 'kimi'
    case 'deepseek':
      return 'deepseek'
    case 'qwen':
    case 'dashscope':
      return 'qwen'
    case 'tencent-plan':
    case 'token-plan':
    case 'tencent-token-plan':
      return 'tencent-plan'
    case 'hunyuan-anthropic':
    case 'hunyuan':
    case 'tencent-hunyuan':
      return 'hunyuan-anthropic'
    case 'stepfun':
    case 'step-plan':
      return 'stepfun'
    case 'xfyun':
    case 'iflytek':
    case 'i-flytek':
      return 'xfyun'
    case 'qianfan-anthropic':
    case 'qianfan':
    case 'baidu-qianfan':
      return 'qianfan-anthropic'
    default:
      return undefined
  }
}

export function getAnthropicCompatProfileDefaults(
  profile: string | undefined | null,
): AnthropicCompatProfileDefaults {
  switch (normalizeAnthropicCompatProfile(profile)) {
    case 'minimax':
      return {
        apiTimeoutMs: '3000000',
        baseUrl: 'https://api.minimax.chat/v1',
        model: 'MiniMax-M2.7',
      }
    case 'glm':
      return {
        apiTimeoutMs: '3000000',
        baseUrl: 'https://open.bigmodel.cn/api/anthropic',
        model: 'glm-4.7',
      }
    case 'kimi':
      return {
        baseUrl: 'https://api.moonshot.ai/anthropic',
        enableToolSearch: false,
        model: 'kimi-k2.5',
        subagentModel: 'kimi-k2.5',
      }
    case 'deepseek':
      return {
        apiTimeoutMs: '600000',
        baseUrl: 'https://api.deepseek.com/anthropic',
        model: 'deepseek-chat',
      }
    case 'qwen':
      return {
        baseUrl: 'https://dashscope.aliyuncs.com/api/v2/apps/anthropic',
        model: 'qwen3.6-plus',
      }
    case 'tencent-plan':
      return {
        baseUrl: 'https://api.lkeap.cloud.tencent.com/v1/anthropic',
        model: 'tc-code-latest',
      }
    case 'hunyuan-anthropic':
      return {
        baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1/anthropic',
        model: 'hunyuan-2.0-instruct-20251111',
      }
    case 'stepfun':
      return {
        baseUrl: 'https://api.stepfun.com/step_plan',
        model: 'step-3.5-flash',
      }
    case 'xfyun':
      return {
        apiTimeoutMs: '600000',
        baseUrl: 'https://maas-coding-api.cn-huabei-1.xf-yun.com/anthropic',
        model: 'astron-code-latest',
      }
    case 'qianfan-anthropic':
      return {
        baseUrl: 'https://qianfan.baidubce.com/v2/anthropic',
        model: 'qianfan-code-latest',
      }
    default:
      return {}
  }
}

function setDefaultEnv(
  env: Record<string, string | undefined>,
  key: string,
  value: string | undefined,
): void {
  if (value === undefined || trimEnvValue(env[key])) {
    return
  }
  env[key] = value
}

export function applyAnthropicCompatProfileDefaults(
  env: Record<string, string | undefined>,
): void {
  const defaults = getAnthropicCompatProfileDefaults(env.ANTHROPIC_COMPAT_PRESET)
  const defaultModel = defaults.model

  setDefaultEnv(env, 'ANTHROPIC_BASE_URL', defaults.baseUrl)
  setDefaultEnv(env, 'ANTHROPIC_MODEL', defaultModel)
  setDefaultEnv(env, 'ANTHROPIC_DEFAULT_OPUS_MODEL', defaultModel)
  setDefaultEnv(env, 'ANTHROPIC_DEFAULT_SONNET_MODEL', defaultModel)
  setDefaultEnv(env, 'ANTHROPIC_DEFAULT_HAIKU_MODEL', defaultModel)
  setDefaultEnv(env, 'ANTHROPIC_SMALL_FAST_MODEL', defaultModel)
  setDefaultEnv(env, 'CLAUDE_CODE_SUBAGENT_MODEL', defaults.subagentModel)
  setDefaultEnv(
    env,
    'ENABLE_TOOL_SEARCH',
    defaults.enableToolSearch === undefined
      ? undefined
      : String(defaults.enableToolSearch),
  )
  setDefaultEnv(env, 'API_TIMEOUT_MS', defaults.apiTimeoutMs)
}

export function getAnthropicCompatConfigFromEnv(
  env: Record<string, string | undefined>,
): AnthropicCompatConfig {
  const normalizedProfile = normalizeAnthropicCompatProfile(
    env.ANTHROPIC_COMPAT_PRESET,
  )
  const defaults = getAnthropicCompatProfileDefaults(normalizedProfile)
  const baseUrl = trimEnvValue(env.ANTHROPIC_BASE_URL)
  const model = trimEnvValue(env.ANTHROPIC_MODEL)

  return {
    apiKey:
      trimEnvValue(env.ANTHROPIC_API_KEY) ||
      trimEnvValue(env.ANTHROPIC_AUTH_TOKEN),
    baseUrl,
    effectiveBaseUrl: baseUrl || defaults.baseUrl,
    effectiveModel: model || defaults.model,
    model,
    profile: normalizedProfile ?? 'manual',
  }
}
