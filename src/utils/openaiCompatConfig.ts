import { isEnvTruthy } from './envUtils.js'

export type OpenAICompatApiFormat = 'auto' | 'chat_completions' | 'responses'
export type OpenAICompatProfile =
  | 'authless'
  | 'azure'
  | 'chatgpt'
  | 'hunyuan'
  | 'lmstudio'
  | 'moonshot'
  | 'ollama'
  | 'qianfan'
  | 'xfyun'
export type OpenAICompatUiProfile = OpenAICompatProfile | 'manual'

export type OpenAICompatProfileDefaults = {
  apiKeyHeaderName?: string
  apiKeyScheme?: string
  baseUrl?: string
  disableAuth?: boolean
  model?: string
}

export type OpenAICompatConfig = {
  apiFormat: OpenAICompatApiFormat
  apiKey?: string
  apiKeyHeaderName?: string
  apiKeyScheme?: string
  baseUrl?: string
  disableAuth: boolean
  disableAuthExplicit: boolean
  effectiveApiKeyHeaderName: string
  effectiveApiKeyScheme: string
  effectiveBaseUrl?: string
  effectiveModel?: string
  enabled: boolean
  model?: string
  profile: OpenAICompatUiProfile
}

export const OPENAI_COMPAT_API_FORMAT_LABELS: Record<
  OpenAICompatApiFormat,
  string
> = {
  auto: 'Auto',
  chat_completions: 'Chat Completions',
  responses: 'Responses',
}

export const OPENAI_COMPAT_PROFILE_LABELS: Record<
  OpenAICompatUiProfile,
  string
> = {
  authless: 'Authless',
  azure: 'Azure OpenAI',
  chatgpt: 'ChatGPT',
  hunyuan: 'Tencent Hunyuan',
  lmstudio: 'LM Studio',
  manual: 'Manual',
  moonshot: 'Moonshot / Kimi',
  ollama: 'Ollama',
  qianfan: 'Baidu Qianfan',
  xfyun: 'iFlytek Astron',
}

function trimEnvValue(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function normalizeOpenAICompatProfile(
  profile: string | undefined | null,
): OpenAICompatProfile | undefined {
  switch (profile?.trim().toLowerCase()) {
    case 'azure':
    case 'azure-openai':
    case 'azure_openai':
      return 'azure'
    case 'hunyuan':
    case 'tencent':
    case 'tencent-hunyuan':
    case 'tencent_hunyuan':
      return 'hunyuan'
    case 'ollama':
      return 'ollama'
    case 'lmstudio':
    case 'lm-studio':
      return 'lmstudio'
    case 'moonshot':
    case 'kimi':
      return 'moonshot'
    case 'qianfan':
    case 'baidu':
    case 'baidu-qianfan':
    case 'baidu_qianfan':
      return 'qianfan'
    case 'xfyun':
    case 'astron':
    case 'iflytek':
    case 'i-flytek':
      return 'xfyun'
    case 'authless':
    case 'local':
    case 'local-openai':
    case 'no-auth':
    case 'noauth':
      return 'authless'
    case 'chatgpt':
      return 'chatgpt'
    default:
      return undefined
  }
}

export function getOpenAICompatProfileDefaults(
  profile: string | undefined | null,
): OpenAICompatProfileDefaults {
  switch (normalizeOpenAICompatProfile(profile)) {
    case 'azure':
      return {
        apiKeyHeaderName: 'api-key',
        apiKeyScheme: '',
      }
    case 'hunyuan':
      return {
        baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
        model: 'hunyuan-turbos-latest',
      }
    case 'ollama':
      return {
        baseUrl: 'http://127.0.0.1:11434/v1',
        disableAuth: true,
      }
    case 'lmstudio':
      return {
        baseUrl: 'http://127.0.0.1:1234/v1',
        disableAuth: true,
      }
    case 'moonshot':
      return {
        baseUrl: 'https://api.moonshot.ai/v1',
        model: 'kimi-k2.5',
      }
    case 'qianfan':
      return {
        baseUrl: 'https://qianfan.baidubce.com/v2/coding',
        model: 'qianfan-code-latest',
      }
    case 'xfyun':
      return {
        baseUrl: 'https://maas-coding-api.cn-huabei-1.xf-yun.com/v2',
        model: 'astron-code-latest',
      }
    case 'authless':
      return {
        disableAuth: true,
      }
    case 'chatgpt':
      return {
        baseUrl: 'https://chatgpt.com/backend-api/codex/responses',
        disableAuth: true,
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
  if (value === undefined || env[key] !== undefined) {
    return
  }
  env[key] = value
}

export function applyOpenAICompatProfileDefaults(
  env: Record<string, string | undefined>,
): void {
  const defaults = getOpenAICompatProfileDefaults(env.OPENAI_COMPAT_PROFILE)
  setDefaultEnv(env, 'OPENAI_BASE_URL', defaults.baseUrl)
  setDefaultEnv(env, 'OPENAI_MODEL', defaults.model)
}

export function parseOpenAICompatApiFormat(
  value: string | undefined | null,
): OpenAICompatApiFormat {
  switch (value?.trim().toLowerCase()) {
    case 'responses':
    case 'response':
    case 'openai_responses':
      return 'responses'
    case 'chat':
    case 'chat_completions':
    case 'chat-completions':
    case 'completions':
      return 'chat_completions'
    default:
      return 'auto'
  }
}

export function getOpenAICompatConfigFromEnv(
  env: Record<string, string | undefined>,
): OpenAICompatConfig {
  const normalizedProfile = normalizeOpenAICompatProfile(
    env.OPENAI_COMPAT_PROFILE,
  )
  const defaults = getOpenAICompatProfileDefaults(normalizedProfile)
  const disableAuthExplicit = Object.prototype.hasOwnProperty.call(
    env,
    'OPENAI_COMPAT_DISABLE_AUTH',
  )
  const explicitApiKeyScheme = Object.prototype.hasOwnProperty.call(
    env,
    'OPENAI_API_KEY_SCHEME',
  )

  const baseUrl = trimEnvValue(env.OPENAI_BASE_URL)
  const apiKey = trimEnvValue(env.OPENAI_API_KEY)
  const apiKeyHeaderName = trimEnvValue(env.OPENAI_API_KEY_HEADER)
  const apiKeyScheme = explicitApiKeyScheme
    ? (env.OPENAI_API_KEY_SCHEME?.trim() ?? '')
    : undefined
  const model = trimEnvValue(env.OPENAI_MODEL)

  return {
    apiFormat: parseOpenAICompatApiFormat(env.OPENAI_COMPAT_API_FORMAT),
    apiKey,
    apiKeyHeaderName,
    apiKeyScheme,
    baseUrl,
    disableAuth: disableAuthExplicit
      ? isEnvTruthy(env.OPENAI_COMPAT_DISABLE_AUTH)
      : defaults.disableAuth === true,
    disableAuthExplicit,
    effectiveApiKeyHeaderName:
      apiKeyHeaderName || defaults.apiKeyHeaderName || 'Authorization',
    effectiveApiKeyScheme:
      apiKeyScheme ?? defaults.apiKeyScheme ?? 'Bearer',
    effectiveBaseUrl: baseUrl || defaults.baseUrl,
    effectiveModel: model || defaults.model,
    enabled: isEnvTruthy(env.CLAUDE_CODE_USE_OPENAI_COMPAT),
    model,
    profile: normalizedProfile ?? 'manual',
  }
}
