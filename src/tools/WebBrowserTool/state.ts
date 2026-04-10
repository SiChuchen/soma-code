import type { AppState } from '../../state/AppState.js'

type SetAppState = (updater: (prev: AppState) => AppState) => void

type WebBrowserState = {
  active: boolean
  url?: string
}

export function setWebBrowserState(
  setAppState: SetAppState,
  next: WebBrowserState,
): void {
  setAppState(prev => {
    if (prev.bagelActive === next.active && prev.bagelUrl === next.url) {
      return prev
    }

    return {
      ...prev,
      bagelActive: next.active,
      bagelUrl: next.url,
    }
  })
}

export function clearWebBrowserState(setAppState: SetAppState): void {
  setWebBrowserState(setAppState, { active: false })
}
