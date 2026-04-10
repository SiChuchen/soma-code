import { isEnvTruthy } from '../utils/envUtils.js'
import { getSettingsForSource } from '../utils/settings/settings.js'

export type CoordinatorModeResolution = {
  enabled: boolean
  source:
    | 'cli'
    | 'projectSettings'
    | 'userSettings'
    | 'session'
    | 'env'
    | 'default'
}

export function resolveCoordinatorMode(options?: {
  cliOverride?: boolean
  sessionMode?: 'coordinator' | 'normal' | undefined
}): CoordinatorModeResolution {
  if (options?.cliOverride !== undefined) {
    return {
      enabled: options.cliOverride,
      source: 'cli',
    }
  }

  const projectSetting = getSettingsForSource('projectSettings')?.coordinator
  if (projectSetting !== undefined) {
    return {
      enabled: projectSetting,
      source: 'projectSettings',
    }
  }

  const userDefault = getSettingsForSource('userSettings')?.defaultCoordinator
  if (userDefault !== undefined) {
    return {
      enabled: userDefault,
      source: 'userSettings',
    }
  }

  if (options?.sessionMode) {
    return {
      enabled: options.sessionMode === 'coordinator',
      source: 'session',
    }
  }

  if (isEnvTruthy(process.env.CLAUDE_CODE_COORDINATOR_MODE)) {
    return {
      enabled: true,
      source: 'env',
    }
  }

  return {
    enabled: false,
    source: 'default',
  }
}
