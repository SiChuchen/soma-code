export type ApiCompatibility = 'anthropic' | 'openai'

export const API_VENDOR_OPTIONS = [
  'custom',
  'minimax',
  'glm',
  'kimi-anthropic',
  'moonshot',
  'deepseek',
  'qwen',
  'tencent-plan',
  'hunyuan-anthropic',
  'hunyuan',
  'stepfun',
  'xfyun-anthropic',
  'xfyun',
  'qianfan-anthropic',
  'qianfan',
  'azure',
  'authless',
  'ollama',
  'lmstudio',
] as const

export type ApiVendorOption = (typeof API_VENDOR_OPTIONS)[number]

export type PresetApiVendorOption = Exclude<ApiVendorOption, 'custom'>

export const API_VENDOR_LABELS: Record<ApiVendorOption, string> = {
  custom: 'Custom',
  minimax: 'MiniMax',
  glm: 'Zhipu GLM',
  'kimi-anthropic': 'Moonshot / Kimi (Provider-compatible)',
  moonshot: 'Moonshot / Kimi (OpenAI-compatible)',
  deepseek: 'DeepSeek',
  qwen: 'Qwen / DashScope',
  'tencent-plan': 'Tencent Token Plan',
  'hunyuan-anthropic': 'Tencent Hunyuan (Provider-compatible)',
  hunyuan: 'Tencent Hunyuan (OpenAI-compatible)',
  stepfun: 'StepFun',
  'xfyun-anthropic': 'iFlytek Coding Plan',
  xfyun: 'iFlytek Astron',
  'qianfan-anthropic': 'Baidu Qianfan (Provider-compatible)',
  qianfan: 'Baidu Qianfan (OpenAI-compatible)',
  azure: 'Azure OpenAI',
  authless: 'Authless OpenAI-compatible',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
}

const OPENAI_VENDOR_PROFILES: Record<
  Exclude<
    PresetApiVendorOption,
    | 'minimax'
    | 'glm'
    | 'kimi-anthropic'
    | 'deepseek'
    | 'qwen'
    | 'tencent-plan'
    | 'hunyuan-anthropic'
    | 'stepfun'
    | 'xfyun-anthropic'
    | 'qianfan-anthropic'
  >,
  string
> = {
  moonshot: 'moonshot',
  hunyuan: 'hunyuan',
  xfyun: 'xfyun',
  qianfan: 'qianfan',
  azure: 'azure',
  authless: 'authless',
  ollama: 'ollama',
  lmstudio: 'lmstudio',
}

const ANTHROPIC_VENDOR_PRESETS: Record<
  Exclude<
    PresetApiVendorOption,
    | 'moonshot'
    | 'hunyuan'
    | 'xfyun'
    | 'qianfan'
    | 'azure'
    | 'authless'
    | 'ollama'
    | 'lmstudio'
  >,
  string
> = {
  minimax: 'minimax',
  glm: 'glm',
  'kimi-anthropic': 'kimi',
  deepseek: 'deepseek',
  qwen: 'qwen',
  'tencent-plan': 'tencent-plan',
  'hunyuan-anthropic': 'hunyuan-anthropic',
  stepfun: 'stepfun',
  'xfyun-anthropic': 'xfyun',
  'qianfan-anthropic': 'qianfan-anthropic',
}

export function getApiCompatibilityForVendor(
  vendor: PresetApiVendorOption,
): ApiCompatibility {
  return vendor in OPENAI_VENDOR_PROFILES ? 'openai' : 'anthropic'
}

export function getOpenAIProfileForVendor(
  vendor: PresetApiVendorOption,
): string | undefined {
  if (vendor in OPENAI_VENDOR_PROFILES) {
    return OPENAI_VENDOR_PROFILES[vendor as keyof typeof OPENAI_VENDOR_PROFILES]
  }
  return undefined
}

export function getAnthropicPresetForVendor(
  vendor: PresetApiVendorOption,
): string | undefined {
  if (vendor in ANTHROPIC_VENDOR_PRESETS) {
    return ANTHROPIC_VENDOR_PRESETS[
      vendor as keyof typeof ANTHROPIC_VENDOR_PRESETS
    ]
  }
  return undefined
}

export function getApiVendorFromProfiles(options: {
  anthropicProfile?: string
  openAICompatEnabled: boolean
  openAIProfile?: string
}): ApiVendorOption {
  const { anthropicProfile, openAICompatEnabled, openAIProfile } = options

  if (openAICompatEnabled) {
    switch (openAIProfile) {
      case 'moonshot':
        return 'moonshot'
      case 'qianfan':
        return 'qianfan'
      case 'hunyuan':
        return 'hunyuan'
      case 'xfyun':
        return 'xfyun'
      case 'azure':
        return 'azure'
      case 'authless':
        return 'authless'
      case 'ollama':
        return 'ollama'
      case 'lmstudio':
        return 'lmstudio'
      default:
        return 'custom'
    }
  }

  switch (anthropicProfile) {
    case 'minimax':
      return 'minimax'
    case 'glm':
      return 'glm'
    case 'kimi':
      return 'kimi-anthropic'
    case 'deepseek':
      return 'deepseek'
    case 'qwen':
      return 'qwen'
    case 'tencent-plan':
      return 'tencent-plan'
    case 'hunyuan-anthropic':
      return 'hunyuan-anthropic'
    case 'stepfun':
      return 'stepfun'
    case 'xfyun':
      return 'xfyun-anthropic'
    case 'qianfan-anthropic':
      return 'qianfan-anthropic'
    default:
      return 'custom'
  }
}
