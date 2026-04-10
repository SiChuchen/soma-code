import { feature } from 'bun:bundle'
import type { PendingClassifierCheck } from '../../../types/permissions.js'
import { logError } from '../../../utils/log.js'
import type { PermissionDecision } from '../../../utils/permissions/PermissionResult.js'
import type { PermissionUpdate } from '../../../utils/permissions/PermissionUpdateSchema.js'
import type { PermissionContext } from '../PermissionContext.js'

type CoordinatorPermissionParams = {
  ctx: PermissionContext
  pendingClassifierCheck?: PendingClassifierCheck | undefined
  updatedInput: Record<string, unknown> | undefined
  suggestions: PermissionUpdate[] | undefined
  permissionMode: string | undefined
}

/**
 * Handles the coordinator worker permission flow.
 *
 * For coordinator workers, automated checks (hooks and classifier) are
 * awaited sequentially before falling through to the interactive dialog.
 *
 * Returns a PermissionDecision if the automated checks resolved the
 * permission, or null if the caller should fall through to the
 * interactive dialog.
 */
async function handleCoordinatorPermission(
  params: CoordinatorPermissionParams,
): Promise<PermissionDecision | null> {
  const { ctx, updatedInput, suggestions, permissionMode } = params

  // 1. Try permission hooks first (fast, local). If they fail unexpectedly,
  // keep moving so the classifier or dialog can still resolve the request.
  try {
    const hookResult = await ctx.runHooks(
      permissionMode,
      suggestions,
      updatedInput,
    )
    if (hookResult) {
      return hookResult
    }
  } catch (error) {
    if (error instanceof Error) {
      logError(
        new Error(`Coordinator permission hooks failed: ${error.message}`),
      )
    } else {
      logError(
        new Error(`Coordinator permission hooks failed: ${String(error)}`),
      )
    }
  }

  // 2. Try classifier (slow, inference -- bash only). This runs even if hooks
  // failed, so a transient hook issue does not force an immediate dialog.
  try {
    const classifierResult = feature('BASH_CLASSIFIER')
      ? await ctx.tryClassifier?.(params.pendingClassifierCheck, updatedInput)
      : null
    if (classifierResult) {
      return classifierResult
    }
  } catch (error) {
    if (error instanceof Error) {
      logError(
        new Error(`Coordinator permission classifier failed: ${error.message}`),
      )
    } else {
      logError(
        new Error(
          `Coordinator permission classifier failed: ${String(error)}`,
        ),
      )
    }
  }

  // 3. Neither resolved (or checks failed) -- fall through to dialog below.
  // Hooks already ran, classifier already consumed.
  return null
}

export { handleCoordinatorPermission }
export type { CoordinatorPermissionParams }
