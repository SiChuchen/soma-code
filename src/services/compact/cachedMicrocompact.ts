import {
  getCachedMCConfig as readCachedMCConfig,
  type CachedMCConfig,
} from './cachedMCConfig.js'

export type CacheDeleteEdit = {
  type: 'delete'
  cache_reference: string
}

export type CacheEditsBlock = {
  type: 'cache_edits'
  edits: CacheDeleteEdit[]
}

export type PinnedCacheEdits = {
  userMessageIndex: number
  block: CacheEditsBlock
}

export type CachedMCState = {
  registeredTools: Set<string>
  toolOrder: string[]
  deletedRefs: Set<string>
  pinnedEdits: PinnedCacheEdits[]
  toolGroups: string[][]
  sentToolCount: number
}

export function createCachedMCState(): CachedMCState {
  return {
    registeredTools: new Set<string>(),
    toolOrder: [],
    deletedRefs: new Set<string>(),
    pinnedEdits: [],
    toolGroups: [],
    sentToolCount: 0,
  }
}

export function resetCachedMCState(state: CachedMCState): void {
  state.registeredTools.clear()
  state.toolOrder.length = 0
  state.deletedRefs.clear()
  state.pinnedEdits.length = 0
  state.toolGroups.length = 0
  state.sentToolCount = 0
}

export function getCachedMCConfig(): CachedMCConfig {
  return readCachedMCConfig()
}

function isEnvTruthy(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function isCachedMicrocompactEnabled(): boolean {
  return (
    getCachedMCConfig().enabled && !isEnvTruthy(process.env.DISABLE_COMPACT)
  )
}

export function isModelSupportedForCacheEditing(model: string): boolean {
  const config = getCachedMCConfig()
  return config.supportedModels.some(pattern => model.includes(pattern))
}

export function registerToolResult(
  state: CachedMCState,
  toolUseId: string,
): void {
  if (state.registeredTools.has(toolUseId)) {
    return
  }

  state.registeredTools.add(toolUseId)
  state.toolOrder.push(toolUseId)
}

export function registerToolMessage(
  state: CachedMCState,
  toolUseIds: string[],
): void {
  if (toolUseIds.length > 0) {
    state.toolGroups.push([...toolUseIds])
  }
}

export function markToolsSentToAPI(state: CachedMCState): void {
  state.sentToolCount = state.toolOrder.length
}

export function getToolResultsToDelete(state: CachedMCState): string[] {
  if (!isCachedMicrocompactEnabled()) {
    return []
  }

  const config = getCachedMCConfig()
  const sentTools = state.toolOrder
    .slice(0, state.sentToolCount)
    .filter(toolUseId => !state.deletedRefs.has(toolUseId))

  if (sentTools.length <= config.triggerThreshold) {
    return []
  }

  const deleteCount = Math.max(0, sentTools.length - config.keepRecent)
  return sentTools.slice(0, deleteCount)
}

export function createCacheEditsBlock(
  state: CachedMCState,
  toolsToDelete: string[],
): CacheEditsBlock | null {
  const uniqueIds = toolsToDelete.filter(toolUseId => {
    if (state.deletedRefs.has(toolUseId)) {
      return false
    }

    state.deletedRefs.add(toolUseId)
    return true
  })

  if (uniqueIds.length === 0) {
    return null
  }

  return {
    type: 'cache_edits',
    edits: uniqueIds.map(toolUseId => ({
      type: 'delete',
      cache_reference: toolUseId,
    })),
  }
}
