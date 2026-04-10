/**
 * Compatibility layer for the historical "undercover" naming.
 *
 * The public-facing feature is now Public Mode. Existing imports still route
 * through this file so older callsites keep working during the transition.
 */

export {
  getPublicModeInstructions as getUndercoverInstructions,
  isPublicModeEnabled as isUndercover,
  shouldShowPublicModeAutoNotice as shouldShowUndercoverAutoNotice,
} from './publicMode.js'
