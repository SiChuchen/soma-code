import { isEnvTruthy } from '../envUtils.js'
import {
  getAnthropicCompatConfigFromEnv,
  getAnthropicCompatProfileDefaults,
  normalizeAnthropicCompatProfile,
} from '../anthropicCompatConfig.js'
import {
  getOpenAICompatConfigFromEnv,
  getOpenAICompatProfileDefaults,
  normalizeOpenAICompatProfile,
  parseOpenAICompatApiFormat,
  type OpenAICompatApiFormat,
} from '../openaiCompatConfig.js'
import type { ApiSettings, SettingsJson } from './types.js'
import {
  API_VENDOR_LABELS,
  type ApiCompatibility,
  type ApiVendorOption,
  getAnthropicPresetForVendor,
  getApiCompatibilityForVendor,
  getApiVendorFromProfiles,
  getOpenAIProfileForVendor,
  type PresetApiVendorOption,
} from './apiConfigMetadata.js'
import { getPersistedModelSettingFromSettings } from '../inference/router.js'

export const API_CONFIG_LEGACY_ENV_KEYS = [
  'CLAUDE_CODE_USE_OPENAI_COMPAT',
  'CLAUDE_CODE_API_VENDOR_NAME',
  'OPENAI_COMPAT_PROFILE',
  'OPENAI_MODEL',
  'OPENAI_BASE_URL',
  'OPENAI_API_KEY',
  'OPENAI_API_KEY_HEADER',
  'OPENAI_API_KEY_SCHEME',
  'OPENAI_COMPAT_API_FORMAT',
  'OPENAI_COMPAT_DISABLE_AUTH',
  'ANTHROPIC_COMPAT_PRESET',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
] as const

export const API_CONFIG_RUNTIME_ENV_KEYS = [
  ...API_CONFIG_LEGACY_ENV_KEYS,
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL',
  'ENABLE_TOOL_SEARCH',
  'API_TIMEOUT_MS',
] as const

type ApiConfigEnvKey = (typeof API_CONFIG_RUNTIME_ENV_KEYS)[number]

export type ApiVendorDetection = {
  compatibility?: ApiCompatibility
  vendor?: PresetApiVendorOption
}

export type ResolvedApiConfig = {
  anthropicCompatConfig: ReturnType<typeof getAnthropicCompatConfigFromEnv>
  compatibility: ApiCompatibility
  detection: ApiVendorDetection
  effectiveBaseUrl?: string
  effectiveEnv: Record<string, string>
  effectiveModel?: string
  openAICompatConfig: ReturnType<typeof getOpenAICompatConfigFromEnv>
  source: 'default' | 'legacyEnv' | 'settings'
  stored: ApiSettings
  vendor: ApiVendorOption
  vendorDisplayLabel: string
}

function trimApiValue(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normalizeApiKeyScheme(
  value: string | undefined | null,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return value.trim()
}

function cloneApiSettings(api: ApiSettings | undefined): ApiSettings | undefined {
  if (!api) {
    return undefined
  }

  return {
    ...api,
    ...(api.openai ? { openai: { ...api.openai } } : {}),
  }
}

function getEmptyApiRuntimeEnvPatch(): Record<ApiConfigEnvKey, string | undefined> {
  return Object.fromEntries(
    API_CONFIG_RUNTIME_ENV_KEYS.map(key => [key, undefined]),
  ) as Record<ApiConfigEnvKey, string | undefined>
}

function filterDefinedEnv(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const materialized: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      materialized[key] = value
    }
  }
  return materialized
}

function pickLegacyValue(
  env: Record<string, string | undefined>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = trimApiValue(env[key])
    if (value !== undefined) {
      return value
    }
  }

  return undefined
}

function hasExplicitOpenAIEnv(
  env: Record<string, string | undefined>,
): boolean {
  return (
    isEnvTruthy(env.CLAUDE_CODE_USE_OPENAI_COMPAT) ||
    normalizeOpenAICompatProfile(env.OPENAI_COMPAT_PROFILE) !== undefined ||
    trimApiValue(env.OPENAI_BASE_URL) !== undefined ||
    trimApiValue(env.OPENAI_MODEL) !== undefined ||
    trimApiValue(env.OPENAI_API_KEY) !== undefined ||
    trimApiValue(env.OPENAI_API_KEY_HEADER) !== undefined ||
    Object.prototype.hasOwnProperty.call(env, 'OPENAI_API_KEY_SCHEME') ||
    Object.prototype.hasOwnProperty.call(env, 'OPENAI_COMPAT_DISABLE_AUTH') ||
    trimApiValue(env.OPENAI_COMPAT_API_FORMAT) !== undefined
  )
}

function hasExplicitAnthropicEnv(
  env: Record<string, string | undefined>,
): boolean {
  return (
    normalizeAnthropicCompatProfile(env.ANTHROPIC_COMPAT_PRESET) !== undefined ||
    trimApiValue(env.ANTHROPIC_BASE_URL) !== undefined ||
    trimApiValue(env.ANTHROPIC_MODEL) !== undefined ||
    trimApiValue(env.ANTHROPIC_API_KEY) !== undefined ||
    trimApiValue(env.ANTHROPIC_AUTH_TOKEN) !== undefined
  )
}

function getLegacyCompatibility(
  env: Record<string, string | undefined>,
  detection: ApiVendorDetection,
): ApiCompatibility {
  if (isEnvTruthy(env.CLAUDE_CODE_USE_OPENAI_COMPAT)) {
    return 'openai'
  }

  if (normalizeOpenAICompatProfile(env.OPENAI_COMPAT_PROFILE) !== undefined) {
    return 'openai'
  }

  if (normalizeAnthropicCompatProfile(env.ANTHROPIC_COMPAT_PRESET) !== undefined) {
    return 'anthropic'
  }

  const hasOpenAIEnv = hasExplicitOpenAIEnv(env)
  const hasAnthropicEnv = hasExplicitAnthropicEnv(env)

  if (hasOpenAIEnv && !hasAnthropicEnv) {
    return 'openai'
  }

  if (hasAnthropicEnv && !hasOpenAIEnv) {
    return 'anthropic'
  }

  return detection.compatibility ?? 'anthropic'
}

function getApiDefaults(options: {
  compatibility: ApiCompatibility
  mode: 'custom' | 'preset'
  preset?: PresetApiVendorOption
}): {
  apiKeyHeaderName?: string
  apiKeyScheme?: string
  baseUrl?: string
  disableAuth?: boolean
  model?: string
} {
  const { compatibility, mode, preset } = options

  if (mode !== 'preset' || !preset) {
    return {}
  }

  if (compatibility === 'openai') {
    return getOpenAICompatProfileDefaults(getOpenAIProfileForVendor(preset))
  }

  return getAnthropicCompatProfileDefaults(getAnthropicPresetForVendor(preset))
}

export function inferApiVendorFromHints(
  baseUrl: string | undefined,
  model: string | undefined,
  vendorName: string | undefined,
): ApiVendorDetection {
  const normalizedUrl = trimApiValue(baseUrl)?.toLowerCase() ?? ''
  const normalizedModel = trimApiValue(model)?.toLowerCase() ?? ''
  const normalizedVendor = trimApiValue(vendorName)?.toLowerCase() ?? ''
  const combined = `${normalizedVendor} ${normalizedUrl}`
  const includesAny = (needles: string[]) =>
    needles.some(needle => combined.includes(needle))

  if (normalizedUrl.includes(':11434') || normalizedUrl.includes('ollama')) {
    return { compatibility: 'openai', vendor: 'ollama' }
  }

  if (
    normalizedUrl.includes(':1234') ||
    normalizedUrl.includes('lmstudio') ||
    normalizedUrl.includes('lm-studio')
  ) {
    return { compatibility: 'openai', vendor: 'lmstudio' }
  }

  if (normalizedUrl.includes('minimax.chat') || includesAny(['minimax'])) {
    return { compatibility: 'anthropic', vendor: 'minimax' }
  }

  if (
    normalizedUrl.includes('open.bigmodel.cn') ||
    includesAny(['glm', 'zhipu', 'bigmodel'])
  ) {
    return { compatibility: 'anthropic', vendor: 'glm' }
  }

  if (normalizedUrl.includes('api.moonshot.ai')) {
    return normalizedUrl.includes('/anthropic')
      ? { compatibility: 'anthropic', vendor: 'kimi-anthropic' }
      : { compatibility: 'openai', vendor: 'moonshot' }
  }

  if (includesAny(['kimi', 'moonshot'])) {
    return normalizedUrl.includes('/anthropic') ||
      normalizedVendor.includes('anthropic')
      ? { compatibility: 'anthropic', vendor: 'kimi-anthropic' }
      : { compatibility: 'openai', vendor: 'moonshot' }
  }

  if (normalizedUrl.includes('api.deepseek.com') || includesAny(['deepseek'])) {
    return { compatibility: 'anthropic', vendor: 'deepseek' }
  }

  if (
    normalizedUrl.includes('dashscope.aliyuncs.com') ||
    includesAny(['qwen', 'dashscope'])
  ) {
    return { compatibility: 'anthropic', vendor: 'qwen' }
  }

  if (
    normalizedUrl.includes('api.lkeap.cloud.tencent.com') ||
    includesAny(['token plan', 'tencent-plan'])
  ) {
    return { compatibility: 'anthropic', vendor: 'tencent-plan' }
  }

  if (
    normalizedUrl.includes('api.hunyuan.cloud.tencent.com') ||
    includesAny(['hunyuan'])
  ) {
    return normalizedUrl.includes('/anthropic') ||
      normalizedVendor.includes('anthropic')
      ? { compatibility: 'anthropic', vendor: 'hunyuan-anthropic' }
      : { compatibility: 'openai', vendor: 'hunyuan' }
  }

  if (
    normalizedUrl.includes('api.stepfun.com') ||
    includesAny(['stepfun']) ||
    normalizedModel.startsWith('step-')
  ) {
    return { compatibility: 'anthropic', vendor: 'stepfun' }
  }

  if (
    normalizedUrl.includes('xf-yun.com') ||
    includesAny(['xfyun', 'iflytek', 'astron'])
  ) {
    return normalizedUrl.includes('/anthropic') ||
      normalizedVendor.includes('anthropic')
      ? { compatibility: 'anthropic', vendor: 'xfyun-anthropic' }
      : { compatibility: 'openai', vendor: 'xfyun' }
  }

  if (
    normalizedUrl.includes('qianfan.baidubce.com') ||
    includesAny(['qianfan', 'baidu'])
  ) {
    return normalizedUrl.includes('/anthropic')
      ? { compatibility: 'anthropic', vendor: 'qianfan-anthropic' }
      : { compatibility: 'openai', vendor: 'qianfan' }
  }

  if (
    normalizedUrl.includes('.openai.azure.com') ||
    normalizedUrl.includes('/openai/deployments') ||
    includesAny(['azure'])
  ) {
    return { compatibility: 'openai', vendor: 'azure' }
  }

  if (includesAny(['authless', 'no auth', 'no-auth'])) {
    return { compatibility: 'openai', vendor: 'authless' }
  }

  if (
    normalizedUrl.includes('/anthropic') ||
    normalizedVendor.includes('anthropic')
  ) {
    return { compatibility: 'anthropic' }
  }

  if (
    normalizedUrl.includes('/v1') ||
    normalizedUrl.includes('/openai') ||
    normalizedUrl.includes('/responses') ||
    normalizedUrl.includes('/chat/completions') ||
    includesAny(['openai', 'gpt-', 'o1', 'o3'])
  ) {
    return { compatibility: 'openai' }
  }

  return {}
}

export function normalizeApiSettings(
  api: ApiSettings | null | undefined,
): ApiSettings | undefined {
  if (!api) {
    return undefined
  }

  const customName = trimApiValue(api.customName)
  const baseUrl = trimApiValue(api.baseUrl)
  const model = trimApiValue(api.model)
  const apiKey = trimApiValue(api.apiKey)
  const rawPreset =
    api.preset && api.preset !== 'custom' ? (api.preset as PresetApiVendorOption) : undefined
  const mode =
    api.mode === 'preset' || rawPreset !== undefined ? 'preset' : 'custom'
  const preset = mode === 'preset' ? rawPreset : undefined
  const detection = inferApiVendorFromHints(baseUrl, model, customName)
  const compatibility =
    preset !== undefined
      ? getApiCompatibilityForVendor(preset)
      : api.compatibility ?? detection.compatibility ?? 'anthropic'

  const defaults = getApiDefaults({
    compatibility,
    mode,
    preset,
  })

  const openAIApiKeyHeader = trimApiValue(api.openai?.apiKeyHeader)
  const openAIApiKeyScheme =
    api.openai && Object.prototype.hasOwnProperty.call(api.openai, 'apiKeyScheme')
      ? normalizeApiKeyScheme(api.openai.apiKeyScheme)
      : undefined
  const openAIApiFormat =
    api.openai?.apiFormat && api.openai.apiFormat !== 'auto'
      ? (api.openai.apiFormat as OpenAICompatApiFormat)
      : undefined
  const openAIDisableAuth =
    api.openai && Object.prototype.hasOwnProperty.call(api.openai, 'disableAuth')
      ? api.openai.disableAuth
      : undefined

  const normalized: ApiSettings = {
    compatibility,
    mode,
  }

  if (preset !== undefined) {
    normalized.preset = preset
  }

  if (mode === 'custom' && customName) {
    normalized.customName = customName
  }

  if (baseUrl !== undefined && baseUrl !== defaults.baseUrl) {
    normalized.baseUrl = baseUrl
  }

  if (model !== undefined && model !== defaults.model) {
    normalized.model = model
  }

  if (apiKey !== undefined) {
    normalized.apiKey = apiKey
  }

  if (compatibility === 'openai') {
    const nextOpenAI: NonNullable<ApiSettings['openai']> = {}
    const defaultHeader = defaults.apiKeyHeaderName ?? 'Authorization'
    const defaultScheme = defaults.apiKeyScheme ?? 'Bearer'

    if (
      openAIApiKeyHeader !== undefined &&
      openAIApiKeyHeader !== defaultHeader
    ) {
      nextOpenAI.apiKeyHeader = openAIApiKeyHeader
    }

    if (
      openAIApiKeyScheme !== undefined &&
      openAIApiKeyScheme !== defaultScheme
    ) {
      nextOpenAI.apiKeyScheme = openAIApiKeyScheme
    }

    if (openAIApiFormat !== undefined) {
      nextOpenAI.apiFormat = openAIApiFormat
    }

    if (openAIDisableAuth !== undefined) {
      const defaultDisableAuth = defaults.disableAuth === true
      if (openAIDisableAuth !== defaultDisableAuth) {
        nextOpenAI.disableAuth = openAIDisableAuth
      }
    }

    if (Object.keys(nextOpenAI).length > 0) {
      normalized.openai = nextOpenAI
    }
  }

  const hasExplicitData =
    api.mode !== undefined ||
    api.compatibility !== undefined ||
    api.preset !== undefined ||
    customName !== undefined ||
    baseUrl !== undefined ||
    model !== undefined ||
    apiKey !== undefined ||
    openAIApiKeyHeader !== undefined ||
    openAIApiKeyScheme !== undefined ||
    openAIApiFormat !== undefined ||
    openAIDisableAuth !== undefined

  return hasExplicitData ? normalized : undefined
}

export function hasLegacyApiConfigEnv(
  env: Record<string, string | undefined> | undefined,
): boolean {
  if (!env) {
    return false
  }

  return API_CONFIG_LEGACY_ENV_KEYS.some(key => env[key] !== undefined)
}

export function deriveApiSettingsFromLegacyEnv(
  env: Record<string, string | undefined>,
): ApiSettings | undefined {
  if (!hasLegacyApiConfigEnv(env)) {
    return undefined
  }

  const openAICompatConfig = getOpenAICompatConfigFromEnv(env)
  const anthropicCompatConfig = getAnthropicCompatConfigFromEnv(env)
  const customName = trimApiValue(env.CLAUDE_CODE_API_VENDOR_NAME)
  const legacyBaseUrl = pickLegacyValue(env, ['OPENAI_BASE_URL', 'ANTHROPIC_BASE_URL'])
  const legacyModel = pickLegacyValue(env, ['OPENAI_MODEL', 'ANTHROPIC_MODEL'])
  const detection = inferApiVendorFromHints(legacyBaseUrl, legacyModel, customName)
  const compatibility = getLegacyCompatibility(env, detection)
  const vendor = getApiVendorFromProfiles({
    anthropicProfile: anthropicCompatConfig.profile,
    openAICompatEnabled: openAICompatConfig.enabled,
    openAIProfile: openAICompatConfig.profile,
  })
  const mode = vendor === 'custom' ? 'custom' : 'preset'

  return normalizeApiSettings({
    mode,
    compatibility,
    ...(mode === 'preset' && vendor !== 'custom' ? { preset: vendor } : {}),
    ...(mode === 'custom' && customName ? { customName } : {}),
    baseUrl:
      compatibility === 'openai'
        ? pickLegacyValue(env, ['OPENAI_BASE_URL', 'ANTHROPIC_BASE_URL'])
        : pickLegacyValue(env, ['ANTHROPIC_BASE_URL', 'OPENAI_BASE_URL']),
    model:
      compatibility === 'openai'
        ? pickLegacyValue(env, ['OPENAI_MODEL', 'ANTHROPIC_MODEL'])
        : pickLegacyValue(env, ['ANTHROPIC_MODEL', 'OPENAI_MODEL']),
    apiKey:
      compatibility === 'openai'
        ? pickLegacyValue(env, [
            'OPENAI_API_KEY',
            'ANTHROPIC_API_KEY',
            'ANTHROPIC_AUTH_TOKEN',
          ])
        : pickLegacyValue(env, [
            'ANTHROPIC_API_KEY',
            'ANTHROPIC_AUTH_TOKEN',
            'OPENAI_API_KEY',
          ]),
    openai:
      compatibility === 'openai'
        ? {
            apiKeyHeader: trimApiValue(env.OPENAI_API_KEY_HEADER),
            apiKeyScheme: Object.prototype.hasOwnProperty.call(
              env,
              'OPENAI_API_KEY_SCHEME',
            )
              ? (env.OPENAI_API_KEY_SCHEME?.trim() ?? '')
              : undefined,
            apiFormat: parseOpenAICompatApiFormat(env.OPENAI_COMPAT_API_FORMAT),
            disableAuth: Object.prototype.hasOwnProperty.call(
              env,
              'OPENAI_COMPAT_DISABLE_AUTH',
            )
              ? isEnvTruthy(env.OPENAI_COMPAT_DISABLE_AUTH)
              : undefined,
          }
        : undefined,
  })
}

export function buildApiConfigEnvPatch(
  api: ApiSettings | undefined,
): Record<string, string | undefined> {
  const normalized = normalizeApiSettings(api)
  if (!normalized) {
    return {}
  }

  const patch = getEmptyApiRuntimeEnvPatch()
  const compatibility = normalized.compatibility ?? 'anthropic'
  const isPreset =
    normalized.mode === 'preset' &&
    normalized.preset !== undefined &&
    normalized.preset !== 'custom'

  if (compatibility === 'openai') {
    patch.CLAUDE_CODE_USE_OPENAI_COMPAT = '1'

    if (isPreset) {
      patch.OPENAI_COMPAT_PROFILE = getOpenAIProfileForVendor(
        normalized.preset as PresetApiVendorOption,
      )
    }

    patch.OPENAI_BASE_URL = normalized.baseUrl
    patch.OPENAI_MODEL = normalized.model
    patch.OPENAI_API_KEY = normalized.apiKey
    patch.OPENAI_API_KEY_HEADER = normalized.openai?.apiKeyHeader
    patch.OPENAI_COMPAT_API_FORMAT = normalized.openai?.apiFormat

    if (normalized.openai?.apiKeyScheme !== undefined) {
      patch.OPENAI_API_KEY_SCHEME = normalized.openai.apiKeyScheme
    }

    if (normalized.openai?.disableAuth !== undefined) {
      patch.OPENAI_COMPAT_DISABLE_AUTH = String(normalized.openai.disableAuth)
    }
  } else {
    if (isPreset) {
      patch.ANTHROPIC_COMPAT_PRESET = getAnthropicPresetForVendor(
        normalized.preset as PresetApiVendorOption,
      )
    }

    patch.ANTHROPIC_BASE_URL = normalized.baseUrl
    patch.ANTHROPIC_MODEL = normalized.model
    patch.ANTHROPIC_API_KEY = normalized.apiKey

    if (normalized.model) {
      patch.ANTHROPIC_DEFAULT_OPUS_MODEL = normalized.model
      patch.ANTHROPIC_DEFAULT_SONNET_MODEL = normalized.model
      patch.ANTHROPIC_DEFAULT_HAIKU_MODEL = normalized.model
      patch.ANTHROPIC_SMALL_FAST_MODEL = normalized.model
      patch.CLAUDE_CODE_SUBAGENT_MODEL = normalized.model
    }
  }

  if (normalized.mode === 'custom') {
    patch.CLAUDE_CODE_API_VENDOR_NAME = normalized.customName
  }

  return patch
}

export function materializeApiConfigEnv(
  api: ApiSettings | undefined,
): Record<string, string> {
  const env = filterDefinedEnv(buildApiConfigEnvPatch(api))
  const withDefaults = { ...env }

  const anthropicDefaults = getAnthropicCompatProfileDefaults(
    withDefaults.ANTHROPIC_COMPAT_PRESET,
  )
  if (withDefaults.ANTHROPIC_BASE_URL === undefined && anthropicDefaults.baseUrl) {
    withDefaults.ANTHROPIC_BASE_URL = anthropicDefaults.baseUrl
  }
  if (withDefaults.ANTHROPIC_MODEL === undefined && anthropicDefaults.model) {
    withDefaults.ANTHROPIC_MODEL = anthropicDefaults.model
  }
  if (
    withDefaults.ANTHROPIC_DEFAULT_OPUS_MODEL === undefined &&
    anthropicDefaults.model
  ) {
    withDefaults.ANTHROPIC_DEFAULT_OPUS_MODEL = anthropicDefaults.model
  }
  if (
    withDefaults.ANTHROPIC_DEFAULT_SONNET_MODEL === undefined &&
    anthropicDefaults.model
  ) {
    withDefaults.ANTHROPIC_DEFAULT_SONNET_MODEL = anthropicDefaults.model
  }
  if (
    withDefaults.ANTHROPIC_DEFAULT_HAIKU_MODEL === undefined &&
    anthropicDefaults.model
  ) {
    withDefaults.ANTHROPIC_DEFAULT_HAIKU_MODEL = anthropicDefaults.model
  }
  if (
    withDefaults.ANTHROPIC_SMALL_FAST_MODEL === undefined &&
    anthropicDefaults.model
  ) {
    withDefaults.ANTHROPIC_SMALL_FAST_MODEL = anthropicDefaults.model
  }
  if (
    withDefaults.CLAUDE_CODE_SUBAGENT_MODEL === undefined &&
    anthropicDefaults.subagentModel
  ) {
    withDefaults.CLAUDE_CODE_SUBAGENT_MODEL = anthropicDefaults.subagentModel
  }
  if (
    withDefaults.ENABLE_TOOL_SEARCH === undefined &&
    anthropicDefaults.enableToolSearch !== undefined
  ) {
    withDefaults.ENABLE_TOOL_SEARCH = String(anthropicDefaults.enableToolSearch)
  }
  if (
    withDefaults.API_TIMEOUT_MS === undefined &&
    anthropicDefaults.apiTimeoutMs !== undefined
  ) {
    withDefaults.API_TIMEOUT_MS = anthropicDefaults.apiTimeoutMs
  }

  const openAIDefaults = getOpenAICompatProfileDefaults(
    withDefaults.OPENAI_COMPAT_PROFILE,
  )
  if (withDefaults.OPENAI_BASE_URL === undefined && openAIDefaults.baseUrl) {
    withDefaults.OPENAI_BASE_URL = openAIDefaults.baseUrl
  }
  if (withDefaults.OPENAI_MODEL === undefined && openAIDefaults.model) {
    withDefaults.OPENAI_MODEL = openAIDefaults.model
  }

  return withDefaults
}

export function getApiConfigLegacyEnv(
  userSettingsEnv: Record<string, string | undefined>,
  runtimeEnv: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  const currentEnv: Record<string, string | undefined> = {}

  for (const key of API_CONFIG_LEGACY_ENV_KEYS) {
    const value = runtimeEnv[key]
    if (value !== undefined) {
      currentEnv[key] = value
    }
  }

  for (const key of API_CONFIG_LEGACY_ENV_KEYS) {
    const value = userSettingsEnv[key]
    if (value !== undefined) {
      currentEnv[key] = value
    }
  }

  return currentEnv
}

export function isApiConfigEnvKey(key: string): key is ApiConfigEnvKey {
  return API_CONFIG_RUNTIME_ENV_KEYS.includes(key as ApiConfigEnvKey)
}

export function stripApiConfigEnv(
  env: Record<string, string | undefined> | undefined,
): Record<string, string> {
  if (!env) {
    return {}
  }

  const stripped: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (!isApiConfigEnvKey(key) && value !== undefined) {
      stripped[key] = value
    }
  }
  return stripped
}

export function buildApiSettingsWritePatch(
  api: ApiSettings | undefined,
  existingEnv: Record<string, string | undefined> | undefined,
): Pick<SettingsJson, 'api' | 'env'> {
  const normalizedApi = normalizeApiSettings(api)
  const removedKeys = Object.keys(existingEnv ?? {}).filter(isApiConfigEnvKey)
  const strippedEnv = stripApiConfigEnv(existingEnv)

  if (removedKeys.length === 0) {
    return {
      api: normalizedApi,
    }
  }

  if (Object.keys(strippedEnv).length === 0) {
    return {
      api: normalizedApi,
      env: undefined,
    }
  }

  const envPatch: Record<string, string | undefined> = { ...strippedEnv }
  for (const key of removedKeys) {
    envPatch[key] = undefined
  }

  return {
    api: normalizedApi,
    env: envPatch as Record<string, string>,
  }
}

export function resolveApiConfig(options: {
  legacyEnv?: Record<string, string | undefined>
  settingsApi?: ApiSettings | null
}): ResolvedApiConfig {
  const { legacyEnv = {}, settingsApi } = options
  const normalizedSettingsApi = normalizeApiSettings(settingsApi)
  const normalizedLegacyApi = deriveApiSettingsFromLegacyEnv(legacyEnv)

  const source: ResolvedApiConfig['source'] = normalizedSettingsApi
    ? 'settings'
    : normalizedLegacyApi
      ? 'legacyEnv'
      : 'default'
  const stored =
    cloneApiSettings(normalizedSettingsApi ?? normalizedLegacyApi) ?? {
      compatibility: 'anthropic',
      mode: 'custom',
    }
  const detection = inferApiVendorFromHints(
    stored.baseUrl,
    stored.model,
    stored.customName,
  )
  const vendor =
    stored.mode === 'preset' && stored.preset && stored.preset !== 'custom'
      ? stored.preset
      : 'custom'
  const compatibility =
    stored.compatibility ??
    (vendor !== 'custom'
      ? getApiCompatibilityForVendor(vendor)
      : detection.compatibility ?? 'anthropic')
  const effectiveEnv = materializeApiConfigEnv(stored)
  const anthropicCompatConfig = getAnthropicCompatConfigFromEnv(effectiveEnv)
  const openAICompatConfig = getOpenAICompatConfigFromEnv(effectiveEnv)
  const effectiveBaseUrl =
    compatibility === 'openai'
      ? openAICompatConfig.effectiveBaseUrl
      : anthropicCompatConfig.effectiveBaseUrl
  const effectiveModel =
    compatibility === 'openai'
      ? openAICompatConfig.effectiveModel
      : anthropicCompatConfig.effectiveModel

  return {
    anthropicCompatConfig,
    compatibility,
    detection,
    effectiveBaseUrl,
    effectiveEnv,
    effectiveModel,
    openAICompatConfig,
    source,
    stored,
    vendor,
    vendorDisplayLabel: getApiVendorDisplayLabel(
      vendor,
      stored.customName,
      detection,
      compatibility,
    ),
  }
}

export function getMainLoopModelSettingFromSettings(
  settings:
    | Pick<SettingsJson, 'api' | 'env' | 'inference' | 'model'>
    | null
    | undefined,
): string | undefined {
  return getPersistedModelSettingFromSettings(settings)
}

export function getApiCompatibilityLabel(
  compatibility: ApiCompatibility,
): string {
  return compatibility === 'openai'
    ? 'OpenAI-compatible'
    : 'Provider-compatible'
}

export function getApiValueDisplay(
  value: string | undefined,
  effectiveValue: string | undefined,
): string {
  if (!effectiveValue) {
    return 'Not set'
  }

  return value ? effectiveValue : `${effectiveValue} (default)`
}

export function getApiVendorDisplayLabel(
  vendor: ApiVendorOption,
  customVendorName: string | undefined,
  detection: ApiVendorDetection,
  fallbackCompatibility: ApiCompatibility,
): string {
  if (vendor !== 'custom') {
    return API_VENDOR_LABELS[vendor]
  }

  if (customVendorName) {
    return customVendorName
  }

  if (detection.vendor) {
    return `${API_VENDOR_LABELS[detection.vendor]} (auto)`
  }

  return `Custom / ${getApiCompatibilityLabel(
    detection.compatibility ?? fallbackCompatibility,
  )}`
}
