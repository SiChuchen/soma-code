import { feature } from 'bun:bundle'
import { isEnvTruthy } from '../../utils/envUtils.js'

export const WEB_BROWSER_TOOL_ENV =
  'CLAUDE_CODE_ENABLE_WEB_BROWSER_TOOL' as const

export function isWebBrowserToolRequested(): boolean {
  if (feature('WEB_BROWSER_TOOL')) {
    return true
  }
  return isEnvTruthy(process.env[WEB_BROWSER_TOOL_ENV])
}
