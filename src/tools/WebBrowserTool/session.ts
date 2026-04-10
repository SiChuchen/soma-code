import { mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { launchWebBrowserBrowser } from './provider.js'

type ConsoleEntry = {
  type: string
  text: string
  timestamp: number
}

type NetworkEntry = {
  method: string
  url: string
  status?: number
  resourceType?: string
  timestamp: number
}

type WebBrowserSession = {
  browser: any
  context: any
  page: any
  consoleEntries: ConsoleEntry[]
  networkEntries: NetworkEntry[]
}

const MAX_CONSOLE_ENTRIES = 200
const MAX_NETWORK_ENTRIES = 200

let session: WebBrowserSession | null = null

function pushBounded<T>(items: T[], value: T, limit: number): void {
  items.push(value)
  if (items.length > limit) {
    items.splice(0, items.length - limit)
  }
}

function bindPageObservers(current: WebBrowserSession): void {
  current.page.on('console', (message: any) => {
    pushBounded(
      current.consoleEntries,
      {
        type: typeof message.type === 'function' ? message.type() : 'log',
        text: typeof message.text === 'function' ? message.text() : '',
        timestamp: Date.now(),
      },
      MAX_CONSOLE_ENTRIES,
    )
  })

  current.page.on('response', (response: any) => {
    const request = response.request()
    pushBounded(
      current.networkEntries,
      {
        method: typeof request.method === 'function' ? request.method() : 'GET',
        url: typeof response.url === 'function' ? response.url() : '',
        status:
          typeof response.status === 'function' ? response.status() : undefined,
        resourceType:
          typeof request.resourceType === 'function'
            ? request.resourceType()
            : undefined,
        timestamp: Date.now(),
      },
      MAX_NETWORK_ENTRIES,
    )
  })
}

async function createSession(): Promise<WebBrowserSession> {
  const browser = (await launchWebBrowserBrowser()) as any
  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: 720,
    },
  })
  const page = await context.newPage()

  const created: WebBrowserSession = {
    browser,
    context,
    page,
    consoleEntries: [],
    networkEntries: [],
  }

  bindPageObservers(created)
  return created
}

export async function getOrCreateWebBrowserSession(): Promise<WebBrowserSession> {
  if (session) {
    return session
  }

  session = await createSession()
  return session
}

export async function closeWebBrowserSession(): Promise<void> {
  if (!session) {
    return
  }

  const current = session
  session = null

  await current.page.close().catch(() => {})
  await current.context.close().catch(() => {})
  await current.browser.close().catch(() => {})
}

export async function getWebBrowserPageSummary(): Promise<{
  title?: string
  url: string
}> {
  const current = await getOrCreateWebBrowserSession()
  const url = typeof current.page.url === 'function' ? current.page.url() : ''
  const title =
    typeof current.page.title === 'function'
      ? await current.page.title().catch(() => undefined)
      : undefined

  return {
    title,
    url,
  }
}

export async function getWebBrowserArtifactDir(): Promise<string> {
  const dir = join(tmpdir(), 'soma-web-browser')
  await mkdir(dir, { recursive: true })
  return dir
}
