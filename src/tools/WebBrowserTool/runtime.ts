import { join } from 'path'
import type { ToolUseContext } from '../../Tool.js'
import { getWebBrowserProviderAvailability } from './provider.js'
import {
  closeWebBrowserSession,
  getOrCreateWebBrowserSession,
  getWebBrowserArtifactDir,
  getWebBrowserPageSummary,
} from './session.js'
import {
  createUnavailableWebBrowserOutput,
  type WebBrowserInput,
  type WebBrowserOutput,
} from './schema.js'
import { clearWebBrowserState, setWebBrowserState } from './state.js'

export type WebBrowserRuntimeAvailability = {
  available: boolean
  reason: string
}

export interface WebBrowserRuntime {
  getAvailability(): WebBrowserRuntimeAvailability
  execute(
    input: WebBrowserInput,
    context: ToolUseContext,
  ): Promise<WebBrowserOutput>
}

function resolveLocator(page: any, input: Record<string, unknown>): any {
  if (typeof input.selector === 'string') {
    return page.locator(input.selector).first()
  }
  if (typeof input.text === 'string') {
    return page.getByText(input.text, { exact: false }).first()
  }
  if (typeof input.ref === 'string') {
    return page.locator(input.ref).first()
  }
  throw new Error('No target selector was provided.')
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return String(error)
}

class PlaywrightWebBrowserRuntime implements WebBrowserRuntime {
  getAvailability(): WebBrowserRuntimeAvailability {
    return getWebBrowserProviderAvailability()
  }

  async execute(
    input: WebBrowserInput,
    context: ToolUseContext,
  ): Promise<WebBrowserOutput> {
    const availability = this.getAvailability()
    if (!availability.available) {
      clearWebBrowserState(context.setAppState)
      return createUnavailableWebBrowserOutput(input.action, availability.reason)
    }

    try {
      switch (input.action) {
        case 'close': {
          await closeWebBrowserSession()
          clearWebBrowserState(context.setAppState)
          return {
            available: true,
            action: 'close',
            message: 'Closed browser session.',
          }
        }
        case 'navigate': {
          const current = await getOrCreateWebBrowserSession()
          const response = await current.page.goto(input.url, {
            waitUntil: input.waitUntil ?? 'load',
          })
          const page = await getWebBrowserPageSummary()
          setWebBrowserState(context.setAppState, {
            active: true,
            url: page.url,
          })
          return {
            available: true,
            action: 'navigate',
            message: `Opened ${page.url}`,
            page,
            data: {
              status:
                typeof response?.status === 'function'
                  ? response.status()
                  : undefined,
            },
          }
        }
        case 'snapshot': {
          const current = await getOrCreateWebBrowserSession()
          const page = await getWebBrowserPageSummary()
          setWebBrowserState(context.setAppState, {
            active: true,
            url: page.url,
          })

          const data =
            input.format === 'text'
              ? await current.page.locator('body').innerText()
              : await current.page.accessibility.snapshot()

          return {
            available: true,
            action: 'snapshot',
            message: `Captured ${input.format ?? 'accessibility'} snapshot for ${page.url}`,
            page,
            data,
          }
        }
        case 'click': {
          const current = await getOrCreateWebBrowserSession()
          await resolveLocator(current.page, input).click({
            force: false,
            button: 'left',
            clickCount: input.doubleClick ? 2 : 1,
          })
          const page = await getWebBrowserPageSummary()
          setWebBrowserState(context.setAppState, {
            active: true,
            url: page.url,
          })
          return {
            available: true,
            action: 'click',
            message: 'Clicked page element.',
            page,
          }
        }
        case 'type': {
          const current = await getOrCreateWebBrowserSession()
          const locator = resolveLocator(current.page, input)
          await locator.fill(input.text)
          if (input.submit) {
            await locator.press('Enter')
          }
          const page = await getWebBrowserPageSummary()
          setWebBrowserState(context.setAppState, {
            active: true,
            url: page.url,
          })
          return {
            available: true,
            action: 'type',
            message: input.submit
              ? 'Typed into page and submitted.'
              : 'Typed into page.',
            page,
          }
        }
        case 'wait': {
          const current = await getOrCreateWebBrowserSession()
          if (typeof input.ms === 'number') {
            await current.page.waitForTimeout(input.ms)
          }
          if (typeof input.text === 'string') {
            await current.page
              .getByText(input.text, { exact: false })
              .waitFor({ state: 'visible' })
          }
          if (typeof input.textGone === 'string') {
            await current.page
              .getByText(input.textGone, { exact: false })
              .waitFor({ state: 'hidden' })
          }
          const page = await getWebBrowserPageSummary()
          setWebBrowserState(context.setAppState, {
            active: true,
            url: page.url,
          })
          return {
            available: true,
            action: 'wait',
            message: 'Wait condition completed.',
            page,
          }
        }
        case 'evaluate': {
          const current = await getOrCreateWebBrowserSession()
          const data = await current.page.evaluate(
            ({ expression }: { expression: string }) => globalThis.eval(expression),
            { expression: input.expression },
          )
          const page = await getWebBrowserPageSummary()
          setWebBrowserState(context.setAppState, {
            active: true,
            url: page.url,
          })
          return {
            available: true,
            action: 'evaluate',
            message: 'Evaluated page script.',
            page,
            data,
          }
        }
        case 'screenshot': {
          const current = await getOrCreateWebBrowserSession()
          const artifactDir = await getWebBrowserArtifactDir()
          const filePath = join(artifactDir, `web-browser-${Date.now()}.png`)
          await current.page.screenshot({
            path: filePath,
            fullPage: input.fullPage ?? true,
          })
          const page = await getWebBrowserPageSummary()
          setWebBrowserState(context.setAppState, {
            active: true,
            url: page.url,
          })
          return {
            available: true,
            action: 'screenshot',
            message: `Saved screenshot to ${filePath}`,
            page,
            data: {
              path: filePath,
            },
          }
        }
        case 'console': {
          const current = await getOrCreateWebBrowserSession()
          const entries = current.consoleEntries.filter(entry => {
            if (input.errorsOnly && entry.type !== 'error') {
              return false
            }
            if (typeof input.pattern === 'string' && input.pattern.length > 0) {
              return entry.text.includes(input.pattern)
            }
            return true
          })
          const page = await getWebBrowserPageSummary()
          setWebBrowserState(context.setAppState, {
            active: true,
            url: page.url,
          })
          return {
            available: true,
            action: 'console',
            message: `Read ${entries.length} console message${entries.length === 1 ? '' : 's'}.`,
            page,
            data: entries,
          }
        }
        case 'network': {
          const current = await getOrCreateWebBrowserSession()
          const entries = current.networkEntries.filter(entry => {
            if (
              typeof input.urlPattern === 'string' &&
              input.urlPattern.length > 0
            ) {
              return entry.url.includes(input.urlPattern)
            }
            return true
          })
          const page = await getWebBrowserPageSummary()
          setWebBrowserState(context.setAppState, {
            active: true,
            url: page.url,
          })
          return {
            available: true,
            action: 'network',
            message: `Read ${entries.length} network request${entries.length === 1 ? '' : 's'}.`,
            page,
            data: entries,
          }
        }
      }
    } catch (error) {
      const message = normalizeErrorMessage(error)
      return {
        available: true,
        action: input.action,
        message: `WebBrowser ${input.action} failed: ${message}`,
      }
    }
  }
}

const webBrowserRuntime: WebBrowserRuntime = new PlaywrightWebBrowserRuntime()

export function getWebBrowserRuntime(): WebBrowserRuntime {
  return webBrowserRuntime
}

export function isWebBrowserRuntimeAvailable(): boolean {
  return getWebBrowserRuntime().getAvailability().available
}

export function getWebBrowserUnavailableMessage(): string {
  return getWebBrowserRuntime().getAvailability().reason
}
