import type { TerminalQuerier } from '../ink/terminal-querier.js'
import { getSystemThemeName, setCachedSystemTheme } from './systemTheme.js'

export function watchSystemTheme(
  _querier: TerminalQuerier,
  onThemeChange: (theme: 'dark' | 'light') => void,
): () => void {
  const theme = getSystemThemeName()
  setCachedSystemTheme(theme)
  onThemeChange(theme)

  return () => {}
}
