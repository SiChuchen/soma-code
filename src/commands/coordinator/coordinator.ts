import type { LocalCommandCall } from '../../types/command.js'
import { isCoordinatorMode } from '../../coordinator/coordinatorMode.js'
import { resolveCoordinatorMode } from '../../coordinator/resolveCoordinatorMode.js'
import { settingsChangeDetector } from '../../utils/settings/changeDetector.js'
import {
  getRelativeSettingsFilePathForSource,
  getSettingsFilePathForSource,
  getSettingsForSource,
  updateSettingsForSource,
} from '../../utils/settings/settings.js'

const COMMON_HELP_ARGS = new Set(['help', '-h', '--help'])
const PROJECT_SETTINGS_PATH =
  getRelativeSettingsFilePathForSource('projectSettings')
const USER_SETTINGS_PATH = getSettingsFilePathForSource('userSettings')

function formatToggle(value: boolean | undefined): string {
  return value === true ? 'on' : value === false ? 'off' : 'unset'
}

function getStatusMessage(): string {
  const projectSetting = getSettingsForSource('projectSettings')?.coordinator
  const userDefault = getSettingsForSource('userSettings')?.defaultCoordinator
  const resolution = resolveCoordinatorMode()
  const currentSession = isCoordinatorMode() ? 'active' : 'inactive'

  return (
    'Coordinator mode status\n' +
    `- Current session: ${currentSession}\n` +
    `- Current source: ${resolution.source}\n` +
    `- Project setting: ${formatToggle(projectSetting)}\n` +
    `- User default: ${formatToggle(userDefault)}\n` +
    `- Env fallback: ${process.env.CLAUDE_CODE_COORDINATOR_MODE ? 'on' : 'off'}\n` +
    `- Project settings file: ${PROJECT_SETTINGS_PATH}\n` +
    `- User settings file: ${USER_SETTINGS_PATH}\n\n` +
    'Use /coordinator on, /coordinator off, /coordinator default on, or /coordinator default off.\n' +
    'Stored settings apply to new sessions. The current session is unchanged.'
  )
}

function getHelpText(): string {
  return (
    'Usage: /coordinator [status|on|off|default on|default off|default clear]\n\n' +
    'Coordinator mode management:\n' +
    '- /coordinator or /coordinator status: show current coordinator state\n' +
    '- /coordinator on: enable coordinator mode for this project\n' +
    '- /coordinator off: disable coordinator mode for this project\n' +
    '- /coordinator default on: set the user default to coordinator mode\n' +
    '- /coordinator default off: set the user default to normal mode\n' +
    '- /coordinator default clear: remove the user default\n\n' +
    `Project setting path: ${PROJECT_SETTINGS_PATH}\n` +
    `User setting path: ${USER_SETTINGS_PATH}`
  )
}

function updateProjectCoordinator(value: boolean): string | Error {
  const result = updateSettingsForSource('projectSettings', {
    coordinator: value,
  })
  if (result.error) {
    return new Error(
      `Failed to update coordinator project setting: ${result.error.message}`,
    )
  }

  settingsChangeDetector.notifyChange('projectSettings')
  return PROJECT_SETTINGS_PATH
}

function updateUserDefaultCoordinator(value: boolean | undefined): string | Error {
  const result = updateSettingsForSource('userSettings', {
    defaultCoordinator: value,
  })
  if (result.error) {
    return new Error(
      `Failed to update coordinator user default: ${result.error.message}`,
    )
  }

  settingsChangeDetector.notifyChange('userSettings')
  return USER_SETTINGS_PATH ?? 'user settings'
}

export const call: LocalCommandCall = async args => {
  const normalizedArgs = (args ?? '').trim()

  if (
    normalizedArgs === '' ||
    normalizedArgs === 'status' ||
    normalizedArgs === 'current'
  ) {
    return {
      type: 'text',
      value: getStatusMessage(),
    }
  }

  if (COMMON_HELP_ARGS.has(normalizedArgs)) {
    return {
      type: 'text',
      value: getHelpText(),
    }
  }

  if (
    normalizedArgs === 'on' ||
    normalizedArgs === 'enable' ||
    normalizedArgs === 'true'
  ) {
    const result = updateProjectCoordinator(true)
    return {
      type: 'text',
      value:
        result instanceof Error
          ? result.message
          : `Enabled coordinator mode in ${result}. New sessions in this project will start in coordinator mode.`,
    }
  }

  if (
    normalizedArgs === 'off' ||
    normalizedArgs === 'disable' ||
    normalizedArgs === 'false'
  ) {
    const result = updateProjectCoordinator(false)
    return {
      type: 'text',
      value:
        result instanceof Error
          ? result.message
          : `Disabled coordinator mode in ${result}. Current sessions are unchanged.`,
    }
  }

  if (normalizedArgs.startsWith('default ')) {
    const rawValue = normalizedArgs.slice('default '.length).trim()
    const clearValue =
      rawValue === 'clear' ||
      rawValue === 'unset' ||
      rawValue === 'reset' ||
      rawValue === 'default'

    if (rawValue === 'on' || rawValue === 'true' || rawValue === 'enable') {
      const result = updateUserDefaultCoordinator(true)
      return {
        type: 'text',
        value:
          result instanceof Error
            ? result.message
            : `Set coordinator mode as the user default in ${result}.`,
      }
    }

    if (rawValue === 'off' || rawValue === 'false' || rawValue === 'disable') {
      const result = updateUserDefaultCoordinator(false)
      return {
        type: 'text',
        value:
          result instanceof Error
            ? result.message
            : `Set normal mode as the user default in ${result}.`,
      }
    }

    if (clearValue) {
      const result = updateUserDefaultCoordinator(undefined)
      return {
        type: 'text',
        value:
          result instanceof Error
            ? result.message
            : `Cleared the coordinator default in ${result}.`,
      }
    }

    return {
      type: 'text',
      value: `Unknown coordinator default option: ${rawValue}\n\n${getHelpText()}`,
    }
  }

  return {
    type: 'text',
    value: `Unknown coordinator command: ${normalizedArgs}\n\n${getHelpText()}`,
  }
}
