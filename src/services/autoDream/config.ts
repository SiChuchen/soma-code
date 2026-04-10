// Leaf config module — intentionally minimal imports so UI components
// can read the auto-dream state without dragging in the forked-agent or
// task-registry chain that autoDream.ts pulls in.

import { getInitialSettings } from '../../utils/settings/settings.js'

export type AutoDreamConfig = {
  minHours: number
  minSessions: number
}

export const DEFAULT_AUTO_DREAM_CONFIG: AutoDreamConfig = {
  minHours: 24,
  minSessions: 5,
}

/**
 * Whether background memory consolidation should run.
 *
 * Local settings are the source of truth in the extracted build. When the
 * user has not explicitly configured the setting, default to enabled so the
 * feature is fully local and does not depend on server-side flags.
 */
export function isAutoDreamEnabled(): boolean {
  return getInitialSettings().autoDreamEnabled ?? true
}

export function getAutoDreamConfig(): AutoDreamConfig {
  const settings = getInitialSettings()

  const minHours =
    typeof settings.autoDreamMinHours === 'number' &&
    Number.isFinite(settings.autoDreamMinHours) &&
    settings.autoDreamMinHours > 0
      ? settings.autoDreamMinHours
      : DEFAULT_AUTO_DREAM_CONFIG.minHours

  const minSessions =
    typeof settings.autoDreamMinSessions === 'number' &&
    Number.isFinite(settings.autoDreamMinSessions) &&
    settings.autoDreamMinSessions > 0
      ? Math.floor(settings.autoDreamMinSessions)
      : DEFAULT_AUTO_DREAM_CONFIG.minSessions

  return {
    minHours,
    minSessions,
  }
}
