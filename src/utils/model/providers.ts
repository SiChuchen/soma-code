import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { resolveInferenceClientDescriptor } from '../inference/clientFactory.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider =
  | 'firstParty'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openaiCompatible'

function isFirstPartyLegacyBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}

function getLegacyAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI_COMPAT)
          ? 'openaiCompatible'
          : isFirstPartyLegacyBaseUrl()
            ? 'firstParty'
            : 'openaiCompatible'
}

export function getAPIProvider(): APIProvider {
  try {
    return resolveInferenceClientDescriptor().provider
  } catch {
    return getLegacyAPIProvider()
  }
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

export function isThirdPartyAPIProvider(provider = getAPIProvider()): boolean {
  return provider !== 'firstParty'
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party somacode API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  try {
    const descriptor = resolveInferenceClientDescriptor()
    return descriptor.transportConfig.kind === 'direct'
      ? descriptor.transportConfig.isFirstPartyAnthropicBaseUrl
      : false
  } catch {
    const baseUrl = process.env.ANTHROPIC_BASE_URL
    if (!baseUrl) {
      return true
    }
    try {
      const host = new URL(baseUrl).host
      const allowedHosts = ['api.anthropic.com']
      if (process.env.USER_TYPE === 'ant') {
        allowedHosts.push('api-staging.anthropic.com')
      }
      return allowedHosts.includes(host)
    } catch {
      return false
    }
  }
}
