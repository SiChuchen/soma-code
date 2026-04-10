export type ParsedConnectUrl = {
  serverUrl: string
  authToken?: string
}

const SERVER_QUERY_KEYS = ['serverUrl', 'server_url', 'url', 'server']
const TOKEN_QUERY_KEYS = ['authToken', 'auth_token', 'token']

function getFirstQueryValue(url: URL, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = url.searchParams.get(key)
    if (value) {
      return value
    }
  }
}

function decodeUrlComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function getFallbackProtocol(url: URL): 'http' | 'https' {
  const explicitProtocol =
    getFirstQueryValue(url, ['protocol', 'scheme'])?.toLowerCase() ??
    undefined

  if (explicitProtocol === 'https') {
    return 'https'
  }

  const secure = url.searchParams.get('secure')
  if (secure === '1' || secure === 'true') {
    return 'https'
  }

  return 'http'
}

function normalizeServerUrl(value: string, fallbackProtocol: 'http' | 'https') {
  const decoded = decodeUrlComponent(value).trim()
  if (!decoded) {
    throw new Error('Connect URL is missing the target server URL')
  }

  if (decoded.startsWith('unix:')) {
    return decoded
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(decoded)) {
    return trimTrailingSlash(decoded)
  }

  return trimTrailingSlash(`${fallbackProtocol}://${decoded}`)
}

function parseTcpConnectUrl(url: URL): string {
  const fallbackProtocol = getFallbackProtocol(url)
  const fromQuery = getFirstQueryValue(url, SERVER_QUERY_KEYS)
  if (fromQuery) {
    return normalizeServerUrl(fromQuery, fallbackProtocol)
  }

  const host = url.host
  const pathname = decodeUrlComponent(url.pathname)
  const target = `${host}${pathname}`.trim()
  if (!target) {
    throw new Error('Connect URL is missing a host')
  }

  return normalizeServerUrl(target, fallbackProtocol)
}

function parseUnixConnectUrl(url: URL): string {
  const fallbackProtocol = getFallbackProtocol(url)
  const fromQuery = getFirstQueryValue(url, SERVER_QUERY_KEYS)
  if (fromQuery) {
    return normalizeServerUrl(fromQuery, fallbackProtocol)
  }

  const socketPath = decodeUrlComponent(
    `${url.host}${decodeUrlComponent(url.pathname)}`,
  ).trim()

  if (!socketPath) {
    throw new Error('Connect URL is missing a unix socket path')
  }

  const normalizedSocketPath = socketPath.startsWith('/')
    ? socketPath
    : `/${socketPath}`

  return `unix:${normalizedSocketPath}`
}

export function parseConnectUrl(connectUrl: string): ParsedConnectUrl {
  let url: URL
  try {
    url = new URL(connectUrl)
  } catch {
    throw new Error(`Invalid connect URL: ${connectUrl}`)
  }

  const authToken = getFirstQueryValue(url, TOKEN_QUERY_KEYS)

  switch (url.protocol) {
    case 'cc:':
      return {
        serverUrl: parseTcpConnectUrl(url),
        authToken,
      }
    case 'cc+unix:':
      return {
        serverUrl: parseUnixConnectUrl(url),
        authToken,
      }
    default:
      throw new Error(
        `Unsupported connect URL protocol: ${url.protocol.replace(/:$/, '')}`,
      )
  }
}
