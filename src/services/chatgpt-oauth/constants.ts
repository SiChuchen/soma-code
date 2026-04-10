export const CHATGPT_OAUTH_CONFIG = {
  CLIENT_ID: 'app_EMoamEEZ73f0CkXaXp7hrann',
  AUTH_URL: 'https://auth.openai.com/oauth/authorize',
  TOKEN_URL: 'https://auth.openai.com/oauth/token',
  API_BASE_URL: 'https://chatgpt.com/backend-api',
  SCOPE: 'openid profile email offline_access',
  ORIGINATOR: 'codex_cli_rs',
  // Refresh buffer — attempt refresh when token expires within 60 s
  REFRESH_BUFFER_MS: 60_000,
} as const
