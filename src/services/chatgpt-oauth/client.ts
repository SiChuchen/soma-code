// ChatGPT OAuth client — PKCE flow via auth.openai.com
//
// References:
//   - ben-vargas/ai-sdk-provider-chatgpt-oauth (Vercel AI SDK provider)
//   - numman-ali/opencode-openai-codex-auth  (OpenCode plugin)
import { openBrowser } from '../../utils/browser.js'
import { logError } from '../../utils/log.js'
import { getSecureStorage } from '../../utils/secureStorage/index.js'
import type { ChatGptOAuthData } from '../../utils/secureStorage/types.js'
import { AuthCodeListener } from '../oauth/auth-code-listener.js'
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from '../oauth/crypto.js'
import { CHATGPT_OAUTH_CONFIG } from './constants.js'

// ---------------------------------------------------------------------------
// Secure storage helpers
// ---------------------------------------------------------------------------

function readOAuthData(): ChatGptOAuthData | null {
  return getSecureStorage().read()?.chatgptOauth ?? null
}

function writeOAuthData(data: ChatGptOAuthData): void {
  const storage = getSecureStorage()
  const current = storage.read() ?? {}
  current.chatgptOauth = data
  storage.update(current)
}

function clearOAuthData(): void {
  const storage = getSecureStorage()
  const current = storage.read() ?? {}
  delete current.chatgptOauth
  storage.update(current)
}

// ---------------------------------------------------------------------------
// JWT helpers — extract account_id from access_token or id_token
// ---------------------------------------------------------------------------

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    // base64url decode (Node built-in atob handles standard base64; we need
    // to restore padding first for edge cases)
    let payload = parts[1]
    // Pad to multiple of 4
    while (payload.length % 4 !== 0) payload += '='
    payload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Extract chatgpt_account_id from the access_token JWT.
 *
 * The access_token JWT contains a claim at path:
 *   `https://api.openai.com/auth` → `{ chatgpt_account_id: "..." }`
 *
 * Fallback: id_token may contain `https://chatgpt.com/account_id` or
 * `account_id` at the top level.
 */
function extractAccountId(
  accessToken: string,
  idToken?: string | null,
): string | null {
  // Primary: access_token → https://api.openai.com/auth.chatgpt_account_id
  const accessPayload = decodeJwtPayload(accessToken)
  if (accessPayload) {
    const authClaim = accessPayload['https://api.openai.com/auth']
    if (
      authClaim &&
      typeof authClaim === 'object' &&
      authClaim !== null &&
      'chatgpt_account_id' in authClaim
    ) {
      const accountId = (authClaim as Record<string, unknown>).chatgpt_account_id
      if (typeof accountId === 'string' && accountId) {
        return accountId
      }
    }
  }

  // Fallback: id_token → https://chatgpt.com/account_id
  if (idToken) {
    const idPayload = decodeJwtPayload(idToken)
    if (idPayload) {
      const directId =
        idPayload['https://chatgpt.com/account_id'] ??
        idPayload['account_id'] ??
        idPayload['sub']
      if (typeof directId === 'string' && directId) {
        return directId
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Token expiry check (60 s buffer — matches OpenCode reference implementations)
// ---------------------------------------------------------------------------

function isTokenExpired(expiresAt: number | null): boolean {
  if (expiresAt === null) return false
  return Date.now() + CHATGPT_OAUTH_CONFIG.REFRESH_BUFFER_MS >= expiresAt
}

// ---------------------------------------------------------------------------
// Token refresh — uses application/x-www-form-urlencoded (same as OpenCode)
// ---------------------------------------------------------------------------

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  id_token?: string
}

async function postTokenRequest(
  body: Record<string, string>,
): Promise<TokenResponse> {
  const response = await fetch(CHATGPT_OAUTH_CONFIG.TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(
      `ChatGPT token request failed: ${response.status} ${response.statusText}`,
    )
  }

  return (await response.json()) as TokenResponse
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  return postTokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CHATGPT_OAUTH_CONFIG.CLIENT_ID,
  })
}

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenResponse> {
  return postTokenRequest({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    client_id: CHATGPT_OAUTH_CONFIG.CLIENT_ID,
  })
}

// ---------------------------------------------------------------------------
// Internal: refresh token in storage and return new access token
// ---------------------------------------------------------------------------

async function refreshStoredToken(): Promise<string | null> {
  const data = readOAuthData()
  if (!data?.refreshToken) return null

  try {
    const tokens = await refreshAccessToken(data.refreshToken)
    const expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000

    // Re-extract accountId from new access_token
    let accountId = extractAccountId(tokens.access_token, tokens.id_token)
    // Preserve existing accountId if JWT extraction fails
    if (!accountId) accountId = data.accountId

    writeOAuthData({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? data.refreshToken,
      expiresAt,
      accountId,
      idToken: tokens.id_token ?? data.idToken,
    })

    return tokens.access_token
  } catch (err) {
    logError(err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Public: get access token (reads from storage, auto-refreshes if expired)
// ---------------------------------------------------------------------------

export async function getChatGPTAccessToken(): Promise<string | null> {
  const data = readOAuthData()
  if (!data?.accessToken) return null

  if (isTokenExpired(data.expiresAt)) {
    return refreshStoredToken()
  }

  return data.accessToken
}

// ---------------------------------------------------------------------------
// Public: get stored OAuth data (synchronous, for UI status display)
// ---------------------------------------------------------------------------

export function getChatGPTOAuthData(): ChatGptOAuthData | null {
  return readOAuthData()
}

// ---------------------------------------------------------------------------
// Public: sync refresh for runtime path — proactively refreshes if token is
// within the buffer window and updates storage synchronously. Returns the
// current stored token after any refresh attempt.
// ---------------------------------------------------------------------------

export async function syncRefreshChatGPTToken(): Promise<void> {
  const data = readOAuthData()
  if (!data?.accessToken) return
  if (!isTokenExpired(data.expiresAt)) return
  await refreshStoredToken()
}

// ---------------------------------------------------------------------------
// Public: start OAuth PKCE flow
// ---------------------------------------------------------------------------

export async function startChatGPTOAuth(): Promise<{
  success: boolean
  error?: string
}> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateState()

  const listener = new AuthCodeListener('/callback')

  try {
    const port = await listener.start()
    const redirectUri = `http://localhost:${port}/callback`

    const authUrl = new URL(CHATGPT_OAUTH_CONFIG.AUTH_URL)
    authUrl.searchParams.set('client_id', CHATGPT_OAUTH_CONFIG.CLIENT_ID)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', CHATGPT_OAUTH_CONFIG.SCOPE)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')
    authUrl.searchParams.set('state', state)
    // OpenCode-specific params required by auth.openai.com
    authUrl.searchParams.set('id_token_add_organizations', 'true')
    authUrl.searchParams.set('codex_cli_simplified_flow', 'true')
    authUrl.searchParams.set('originator', CHATGPT_OAUTH_CONFIG.ORIGINATOR)

    const authorizationCode = await listener.waitForAuthorization(
      state,
      async () => {
        await openBrowser(authUrl.toString())
      },
    )

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      authorizationCode,
      codeVerifier,
      redirectUri,
    )

    const accountId = extractAccountId(
      tokens.access_token,
      tokens.id_token,
    )
    const expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000

    writeOAuthData({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      accountId,
      idToken: tokens.id_token ?? null,
    })

    // Redirect browser to success page
    listener.handleSuccessRedirect([], (res, _scopes) => {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(
        '<html><body><h2>ChatGPT authentication successful!</h2>' +
          '<p>You can close this tab and return to soma.</p></body></html>',
      )
    })

    return { success: true }
  } catch (err) {
    logError(err)
    listener.handleErrorRedirect()
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    listener.close()
  }
}

// ---------------------------------------------------------------------------
// Public: revoke stored credentials
// ---------------------------------------------------------------------------

export function revokeChatGPTAuth(): void {
  clearOAuthData()
}
