/* eslint-disable custom-rules/no-process-exit -- CLI subcommand handler intentionally exits */

import {
  clearAuthRelatedCaches,
  performLogout,
} from '../../commands/logout/logout.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../../services/analytics/index.js'
import { getSSLErrorHint } from '../../services/api/errorUtils.js'
import { fetchAndStoreClaudeCodeFirstTokenDate } from '../../services/api/firstTokenDate.js'
import {
  createAndStoreApiKey,
  fetchAndStoreUserRoles,
  refreshOAuthToken,
  shouldUseClaudeAIAuth,
  storeOAuthAccountInfo,
} from '../../services/oauth/client.js'
import { getOauthProfileFromOauthToken } from '../../services/oauth/getOauthProfile.js'
import { OAuthService } from '../../services/oauth/index.js'
import type { OAuthTokens } from '../../services/oauth/types.js'
import {
  clearOAuthTokenCache,
  getAnthropicApiKeyWithSource,
  getAuthTokenSource,
  getOauthAccountInfo,
  getStoredOauthAccountInfo,
  getSubscriptionType,
  saveOAuthTokensIfNeeded,
  validateForceLoginOrg,
} from '../../utils/auth.js'
import { saveGlobalConfig } from '../../utils/config.js'
import { logForDebugging } from '../../utils/debug.js'
import { errorMessage } from '../../utils/errors.js'
import { logError } from '../../utils/log.js'
import { getAPIProvider } from '../../utils/model/providers.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { buildAccountProperties } from '../../utils/status.js'
import { CLI_COMMAND_NAME } from '../../constants/cliName.js'

type AuthStatusSnapshot = {
  apiKeySource?: string
  apiProvider: string
  authMethod: string
  email?: string | null
  loggedIn: boolean
  orgId?: string | null
  orgName?: string | null
  subscriptionType?: string | null
  thirdPartyProviderConfigured: boolean
}

export function computeAuthStatusSnapshot(options: {
  apiKeySource: string
  apiProvider: string
  authTokenSource: string
  oauthAccount?: {
    emailAddress?: string | null
    organizationName?: string | null
    organizationUuid?: string | null
  }
  subscriptionType?: string | null
}): AuthStatusSnapshot {
  const {
    apiKeySource,
    apiProvider,
    authTokenSource,
    oauthAccount,
    subscriptionType,
  } = options
  const isManagedApiKey = apiKeySource === '/login managed key'
  const hasClaudeIdentityToken =
    authTokenSource === 'claude.ai' ||
    authTokenSource === 'CLAUDE_CODE_OAUTH_TOKEN' ||
    authTokenSource === 'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR' ||
    authTokenSource === 'CCR_OAUTH_TOKEN_FILE'
  const loggedIn = hasClaudeIdentityToken || isManagedApiKey
  const thirdPartyProviderConfigured = apiProvider !== 'firstParty'

  let authMethod = 'none'
  if (authTokenSource === 'claude.ai') {
    authMethod = 'claude.ai'
  } else if (hasClaudeIdentityToken) {
    authMethod = 'oauth_token'
  } else if (isManagedApiKey) {
    authMethod = 'console'
  }

  return {
    ...(isManagedApiKey ? { apiKeySource } : {}),
    apiProvider,
    authMethod,
    ...(loggedIn
      ? {
          email: oauthAccount?.emailAddress ?? null,
          orgId: oauthAccount?.organizationUuid ?? null,
          orgName: oauthAccount?.organizationName ?? null,
          subscriptionType: subscriptionType ?? null,
        }
      : {}),
    loggedIn,
    thirdPartyProviderConfigured,
  }
}

/**
 * Shared post-token-acquisition logic. Saves tokens, fetches profile/roles,
 * and sets up the local auth state.
 */
export async function installOAuthTokens(tokens: OAuthTokens): Promise<void> {
  // Clear the Claude identity slot before installing new credentials, but keep
  // third-party endpoint credentials intact.
  await performLogout({ clearOnboarding: false, scope: 'claude' })

  // Reuse pre-fetched profile if available, otherwise fetch fresh
  const profile =
    tokens.profile ?? (await getOauthProfileFromOauthToken(tokens.accessToken))
  if (profile) {
    storeOAuthAccountInfo({
      accountUuid: profile.account.uuid,
      emailAddress: profile.account.email,
      organizationUuid: profile.organization.uuid,
      displayName: profile.account.display_name || undefined,
      hasExtraUsageEnabled:
        profile.organization.has_extra_usage_enabled ?? undefined,
      billingType: profile.organization.billing_type ?? undefined,
      subscriptionCreatedAt:
        profile.organization.subscription_created_at ?? undefined,
      accountCreatedAt: profile.account.created_at,
    })
  } else if (tokens.tokenAccount) {
    // Fallback to token exchange account data when profile endpoint fails
    storeOAuthAccountInfo({
      accountUuid: tokens.tokenAccount.uuid,
      emailAddress: tokens.tokenAccount.emailAddress,
      organizationUuid: tokens.tokenAccount.organizationUuid,
    })
  }

  const storageResult = saveOAuthTokensIfNeeded(tokens)
  clearOAuthTokenCache()

  if (storageResult.warning) {
    logEvent('tengu_oauth_storage_warning', {
      warning:
        storageResult.warning as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
  }

  // Roles and first-token-date may fail for limited-scope tokens (e.g.
  // inference-only from setup-token). They're not required for core auth.
  await fetchAndStoreUserRoles(tokens.accessToken).catch(err =>
    logForDebugging(String(err), { level: 'error' }),
  )

  if (shouldUseClaudeAIAuth(tokens.scopes)) {
    await fetchAndStoreClaudeCodeFirstTokenDate().catch(err =>
      logForDebugging(String(err), { level: 'error' }),
    )
  } else {
    // API key creation is critical for Console users — let it throw.
    const apiKey = await createAndStoreApiKey(tokens.accessToken)
    if (!apiKey) {
      throw new Error(
        'Unable to create API key. The server accepted the request but did not return a key.',
      )
    }
  }

  await clearAuthRelatedCaches()
}

export async function authLogin({
  email,
  sso,
  console: useConsole,
  claudeai,
}: {
  email?: string
  sso?: boolean
  console?: boolean
  claudeai?: boolean
}): Promise<void> {
  if (useConsole && claudeai) {
    process.stderr.write(
      'Error: --console and --claudeai cannot be used together.\n',
    )
    process.exit(1)
  }

  const settings = getInitialSettings()
  // forceLoginMethod is a hard constraint (enterprise setting) — matches ConsoleOAuthFlow behavior.
  // Without it, --console selects Console; --claudeai (or no flag) selects claude.ai.
  const loginWithClaudeAi = settings.forceLoginMethod
    ? settings.forceLoginMethod === 'claudeai'
    : !useConsole
  const orgUUID = settings.forceLoginOrgUUID

  // Fast path: if a refresh token is provided via env var, skip the browser
  // OAuth flow and exchange it directly for tokens.
  const envRefreshToken = process.env.CLAUDE_CODE_OAUTH_REFRESH_TOKEN
  if (envRefreshToken) {
    const envScopes = process.env.CLAUDE_CODE_OAUTH_SCOPES
    if (!envScopes) {
      process.stderr.write(
        'CLAUDE_CODE_OAUTH_SCOPES is required when using CLAUDE_CODE_OAUTH_REFRESH_TOKEN.\n' +
          'Set it to the space-separated scopes the refresh token was issued with\n' +
          '(e.g. "user:inference" or "user:profile user:inference user:sessions:claude_code user:mcp_servers").\n',
      )
      process.exit(1)
    }

    const scopes = envScopes.split(/\s+/).filter(Boolean)

    try {
      logEvent('tengu_login_from_refresh_token', {})

      const tokens = await refreshOAuthToken(envRefreshToken, { scopes })
      await installOAuthTokens(tokens)

      const orgResult = await validateForceLoginOrg()
      if (!orgResult.valid) {
        process.stderr.write(orgResult.message + '\n')
        process.exit(1)
      }

      // Mark onboarding complete — interactive paths handle this via
      // the Onboarding component, but the env var path skips it.
      saveGlobalConfig(current => {
        if (current.hasCompletedOnboarding) return current
        return { ...current, hasCompletedOnboarding: true }
      })

      logEvent('tengu_oauth_success', {
        loginWithClaudeAi: shouldUseClaudeAIAuth(tokens.scopes),
      })
      process.stdout.write('Login successful.\n')
      process.exit(0)
    } catch (err) {
      logError(err)
      const sslHint = getSSLErrorHint(err)
      process.stderr.write(
        `Login failed: ${errorMessage(err)}\n${sslHint ? sslHint + '\n' : ''}`,
      )
      process.exit(1)
    }
  }

  const resolvedLoginMethod = sso ? 'sso' : undefined

  const oauthService = new OAuthService()

  try {
    logEvent('tengu_oauth_flow_start', { loginWithClaudeAi })

    const result = await oauthService.startOAuthFlow(
      async url => {
        process.stdout.write('Opening browser to sign in…\n')
        process.stdout.write(`If the browser didn't open, visit: ${url}\n`)
      },
      {
        loginWithClaudeAi,
        loginHint: email,
        loginMethod: resolvedLoginMethod,
        orgUUID,
      },
    )

    await installOAuthTokens(result)

    const orgResult = await validateForceLoginOrg()
    if (!orgResult.valid) {
      process.stderr.write(orgResult.message + '\n')
      process.exit(1)
    }

    logEvent('tengu_oauth_success', { loginWithClaudeAi })

    process.stdout.write('Login successful.\n')
    process.exit(0)
  } catch (err) {
    logError(err)
    const sslHint = getSSLErrorHint(err)
    process.stderr.write(
      `Login failed: ${errorMessage(err)}\n${sslHint ? sslHint + '\n' : ''}`,
    )
    process.exit(1)
  } finally {
    oauthService.cleanup()
  }
}

export async function authStatus(opts: {
  json?: boolean
  text?: boolean
}): Promise<void> {
  const { source: authTokenSource } = getAuthTokenSource()
  const { source: apiKeySource } = getAnthropicApiKeyWithSource({
    skipRetrievingKeyFromApiKeyHelper: true,
  })
  const apiProvider = getAPIProvider()
  const oauthAccount = getOauthAccountInfo() ?? getStoredOauthAccountInfo()
  const snapshot = computeAuthStatusSnapshot({
    apiKeySource,
    apiProvider,
    authTokenSource,
    oauthAccount,
    subscriptionType: getSubscriptionType(),
  })

  if (opts.text) {
    if (snapshot.loggedIn) {
      const accountProperties = buildAccountProperties()
      for (const prop of accountProperties) {
        const value =
          typeof prop.value === 'string'
            ? prop.value
            : Array.isArray(prop.value)
              ? prop.value.join(', ')
              : null
        if (value === null || value === 'none') {
          continue
        }
        if (prop.label) {
          process.stdout.write(`${prop.label}: ${value}\n`)
        } else {
          process.stdout.write(`${value}\n`)
        }
      }
    } else {
      process.stdout.write(
        snapshot.thirdPartyProviderConfigured
          ? 'No Claude account authentication detected. Third-party inference remains configured separately via /config.\n'
          : `Not logged in. Run ${CLI_COMMAND_NAME} auth login to authenticate.\n`,
      )
    }
  } else {
    process.stdout.write(jsonStringify(snapshot, null, 2) + '\n')
  }
  process.exit(snapshot.loggedIn ? 0 : 1)
}

export async function authLogout(): Promise<void> {
  try {
    await performLogout({ clearOnboarding: false })
  } catch {
    process.stderr.write('Failed to log out.\n')
    process.exit(1)
  }
  process.stdout.write('Successfully logged out from your somacode account.\n')
  process.exit(0)
}
