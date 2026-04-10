import type { LocalCommandCall } from '../../types/command.js'
import { settingsChangeDetector } from '../../utils/settings/changeDetector.js'
import {
  getRelativeSettingsFilePathForSource,
  getSettingsFilePathForSource,
  updateSettingsForSource,
} from '../../utils/settings/settings.js'
import { resolvePublicModeState } from '../../utils/publicMode.js'

const HELP = new Set(['help', '-h', '--help'])
const LOCAL_PATH = getRelativeSettingsFilePathForSource('localSettings')
const USER_PATH = getSettingsFilePathForSource('userSettings')
type PublicModeValue = 'on' | 'off' | 'auto'

function saveLocal(value: PublicModeValue | undefined): string | Error {
  const result = updateSettingsForSource('localSettings', { publicMode: value })
  if (result.error) {
    return new Error(`Failed to update Public Mode local setting: ${result.error.message}`)
  }
  settingsChangeDetector.notifyChange('localSettings')
  return LOCAL_PATH
}

function saveUserDefault(value: PublicModeValue | undefined): string | Error {
  const result = updateSettingsForSource('userSettings', {
    defaultPublicMode: value,
  })
  if (result.error) {
    return new Error(`Failed to update Public Mode user default: ${result.error.message}`)
  }
  settingsChangeDetector.notifyChange('userSettings')
  return USER_PATH ?? 'user settings'
}

function status(): string {
  const resolution = resolvePublicModeState()
  return `Public Mode status
- Current effective state: ${resolution.enabled ? 'enabled' : 'disabled'}
- Current mode: ${resolution.mode}
- Current source: ${resolution.source}
- Repository classification: ${resolution.repoClass}
- Local settings file: ${LOCAL_PATH}
- User settings file: ${USER_PATH}

Compatibility alias: /undercover`
}

const helpText =
  'Usage: /public-mode [status|on|off|auto|default on|default off|default auto|default clear]'

export const call: LocalCommandCall = async args => {
  const input = (args ?? '').trim()
  if (input === '' || input === 'status' || input === 'current') {
    return { type: 'text', value: status() }
  }
  if (HELP.has(input)) {
    return { type: 'text', value: helpText }
  }
  if (input === 'on' || input === 'off' || input === 'auto') {
    const result = saveLocal(input)
    return {
      type: 'text',
      value: result instanceof Error ? result.message : `Saved Public Mode=${input} to ${result}.`,
    }
  }
  if (input.startsWith('default ')) {
    const raw = input.slice('default '.length).trim()
    const next =
      raw === 'on' || raw === 'off' || raw === 'auto' ? raw : undefined
    if (next !== undefined || raw === 'clear' || raw === 'unset' || raw === 'reset') {
      const result = saveUserDefault(next)
      return {
        type: 'text',
        value:
          result instanceof Error
            ? result.message
            : next === undefined
              ? `Cleared the Public Mode default in ${result}.`
              : `Saved the Public Mode default=${next} to ${result}.`,
      }
    }
  }
  return { type: 'text', value: `Unknown Public Mode command: ${input}\n\n${helpText}` }
}
