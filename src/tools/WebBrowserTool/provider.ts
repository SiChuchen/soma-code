import { createRequire } from 'node:module'
import { getIsNonInteractiveSession } from '../../bootstrap/state.js'

const require = createRequire(import.meta.url)

type PlaywrightModule = {
  chromium?: {
    launch(options?: Record<string, unknown>): Promise<unknown>
  }
}

export type WebBrowserProviderAvailability = {
  available: boolean
  reason: string
}

function tryLoadPlaywright(): PlaywrightModule | null {
  try {
    return require('playwright') as PlaywrightModule
  } catch {
    return null
  }
}

export function getWebBrowserProviderAvailability(): WebBrowserProviderAvailability {
  if (getIsNonInteractiveSession()) {
    return {
      available: false,
      reason: 'Web browser automation is only available in interactive REPL sessions.',
    }
  }

  const playwright = tryLoadPlaywright()
  if (!playwright?.chromium) {
    return {
      available: false,
      reason:
        'Web browser automation backend is not installed. Install the "playwright" package and browser binaries to enable WebBrowser.',
    }
  }

  return {
    available: true,
    reason: 'available',
  }
}

export async function launchWebBrowserBrowser(): Promise<unknown> {
  const playwright = tryLoadPlaywright()
  if (!playwright?.chromium) {
    throw new Error(
      'Web browser automation backend is not installed. Install the "playwright" package and browser binaries to enable WebBrowser.',
    )
  }

  return playwright.chromium.launch({
    headless: true,
  })
}
