// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
// Background memory consolidation. Fires the /dream prompt as a forked
// subagent when time-gate passes AND enough sessions have accumulated.
//
// Gate order (cheapest first):
//   1. Time: hours since lastConsolidatedAt >= minHours (one stat)
//   2. Sessions: transcript count with mtime > lastConsolidatedAt >= minSessions
//   3. Lock: no other process mid-consolidation
//
// State is closure-scoped inside initAutoDream() rather than module-level
// (tests call initAutoDream() in beforeEach for a fresh closure).

import type { REPLHookContext } from '../../utils/hooks/postSamplingHooks.js'
import { getSystemPrompt } from '../../constants/prompts.js'
import { getSystemContext, getUserContext } from '../../context.js'
import type { CacheSafeParams } from '../../utils/forkedAgent.js'
import {
  createCacheSafeParams,
  getLastCacheSafeParams,
  runForkedAgent,
} from '../../utils/forkedAgent.js'
import {
  createUserMessage,
  createMemorySavedMessage,
  getMessagesAfterCompactBoundary,
} from '../../utils/messages.js'
import type { Message } from '../../types/message.js'
import { logForDebugging } from '../../utils/debug.js'
import type { ToolUseContext } from '../../Tool.js'
import { logEvent } from '../analytics/index.js'
import { isAutoMemoryEnabled, getAutoMemPath } from '../../memdir/paths.js'
import { getAutoDreamConfig, isAutoDreamEnabled } from './config.js'
import { getProjectDir } from '../../utils/sessionStorage.js'
import {
  getOriginalCwd,
  getKairosActive,
  getIsRemoteMode,
  getSessionId,
} from '../../bootstrap/state.js'
import { createAutoMemCanUseTool } from '../extractMemories/extractMemories.js'
import { buildConsolidationPrompt } from './consolidationPrompt.js'
import {
  readLastConsolidatedAt,
  listSessionsTouchedSince,
  tryAcquireConsolidationLock,
  rollbackConsolidationLock,
} from './consolidationLock.js'
import {
  registerDreamTask,
  addDreamTurn,
  completeDreamTask,
  failDreamTask,
  isDreamTask,
} from '../../tasks/DreamTask/DreamTask.js'
import { FILE_EDIT_TOOL_NAME } from '../../tools/FileEditTool/constants.js'
import { FILE_WRITE_TOOL_NAME } from '../../tools/FileWriteTool/prompt.js'
import { asSystemPrompt } from '../../utils/systemPromptType.js'

// Scan throttle: when time-gate passes but session-gate doesn't, the lock
// mtime doesn't advance, so the time-gate keeps passing every turn.
const SESSION_SCAN_INTERVAL_MS = 10 * 60 * 1000

type DreamTrigger = 'auto' | 'manual'

type StartDreamResult =
  | {
      status: 'started'
      sessionsReviewing: number
      taskId: string
    }
  | {
      status: 'skipped'
      reason: string
    }

type AutoDreamState = {
  lastSessionScanAt: number
}

function isGateOpen(): boolean {
  if (getKairosActive()) return false // KAIROS mode uses disk-skill dream
  if (getIsRemoteMode()) return false
  if (!isAutoMemoryEnabled()) return false
  return isAutoDreamEnabled()
}

type AppendSystemMessageFn = NonNullable<ToolUseContext['appendSystemMessage']>

let runner:
  | ((
      context: REPLHookContext,
      appendSystemMessage?: AppendSystemMessageFn,
    ) => Promise<void>)
  | null = null

/**
 * Call once at startup (from backgroundHousekeeping alongside
 * initExtractMemories), or per-test in beforeEach for a fresh closure.
 */
export function initAutoDream(): void {
  const state: AutoDreamState = { lastSessionScanAt: 0 }

  runner = async function runAutoDream(context, appendSystemMessage) {
    await startDream({
      trigger: 'auto',
      cacheSafeParams: createCacheSafeParams(context),
      toolUseContext: context.toolUseContext,
      appendSystemMessage,
      state,
    })
  }
}

/**
 * Watch the forked agent's messages. For each assistant turn, extracts any
 * text blocks (the agent's reasoning/summary — what the user wants to see)
 * and collapses tool_use blocks to a count. Edit/Write file_paths are
 * collected for phase-flip + the inline completion message.
 */
function makeDreamProgressWatcher(
  taskId: string,
  setAppState: import('../../Task.js').SetAppState,
): (msg: Message) => void {
  return msg => {
    if (msg.type !== 'assistant') return
    let text = ''
    let toolUseCount = 0
    const touchedPaths: string[] = []
    for (const block of msg.message.content) {
      if (block.type === 'text') {
        text += block.text
      } else if (block.type === 'tool_use') {
        toolUseCount++
        if (
          block.name === FILE_EDIT_TOOL_NAME ||
          block.name === FILE_WRITE_TOOL_NAME
        ) {
          const input = block.input as { file_path?: unknown }
          if (typeof input.file_path === 'string') {
            touchedPaths.push(input.file_path)
          }
        }
      }
    }
    addDreamTurn(
      taskId,
      { text: text.trim(), toolUseCount },
      touchedPaths,
      setAppState,
    )
  }
}

/**
 * Entry point from stopHooks. No-op until initAutoDream() has been called.
 * Per-turn cost when enabled: one stat plus a throttled session scan.
 */
export async function executeAutoDream(
  context: REPLHookContext,
  appendSystemMessage?: AppendSystemMessageFn,
): Promise<void> {
  await runner?.(context, appendSystemMessage)
}

export async function executeManualDream(
  context: ToolUseContext,
): Promise<StartDreamResult> {
  return startDream({
    trigger: 'manual',
    cacheSafeParams: await buildManualDreamCacheSafeParams(context),
    toolUseContext: context,
    appendSystemMessage: context.appendSystemMessage,
  })
}

async function startDream({
  trigger,
  cacheSafeParams,
  toolUseContext,
  appendSystemMessage,
  state,
}: {
  trigger: DreamTrigger
  cacheSafeParams: CacheSafeParams
  toolUseContext: ToolUseContext
  appendSystemMessage?: AppendSystemMessageFn
  state?: AutoDreamState
}): Promise<StartDreamResult> {
  const isAutoTrigger = trigger === 'auto'
  const cfg = getAutoDreamConfig()

  if (isAutoTrigger) {
    if (!isGateOpen()) {
      return { status: 'skipped', reason: 'auto-dream is disabled' }
    }
  } else {
    if (getIsRemoteMode()) {
      return {
        status: 'skipped',
        reason: 'Dream is unavailable in remote mode.',
      }
    }
    if (!isAutoMemoryEnabled()) {
      return {
        status: 'skipped',
        reason:
          'Auto-memory is disabled. Enable it first, then run /dream again.',
      }
    }
  }

  let lastAt: number
  try {
    lastAt = await readLastConsolidatedAt()
  } catch (e: unknown) {
    const reason = `Failed to read dream state: ${(e as Error).message}`
    logForDebugging(`[autoDream] ${reason}`)
    return { status: 'skipped', reason }
  }

  const hoursSince = (Date.now() - lastAt) / 3_600_000
  if (isAutoTrigger && hoursSince < cfg.minHours) {
    return { status: 'skipped', reason: 'time gate not met' }
  }

  if (isAutoTrigger && state) {
    const sinceScanMs = Date.now() - state.lastSessionScanAt
    if (sinceScanMs < SESSION_SCAN_INTERVAL_MS) {
      logForDebugging(
        `[autoDream] scan throttle — time-gate passed but last scan was ${Math.round(sinceScanMs / 1000)}s ago`,
      )
      return { status: 'skipped', reason: 'scan throttle active' }
    }
    state.lastSessionScanAt = Date.now()
  }

  let sessionIds: string[]
  try {
    sessionIds = await listSessionsTouchedSince(lastAt)
  } catch (e: unknown) {
    const reason = `Failed to list sessions for dream: ${(e as Error).message}`
    logForDebugging(`[autoDream] ${reason}`)
    return { status: 'skipped', reason }
  }

  const currentSession = getSessionId()
  sessionIds = sessionIds.filter(id => id !== currentSession)

  if (isAutoTrigger && sessionIds.length < cfg.minSessions) {
    logForDebugging(
      `[autoDream] skip — ${sessionIds.length} sessions since last consolidation, need ${cfg.minSessions}`,
    )
    return { status: 'skipped', reason: 'session gate not met' }
  }

  let priorMtime: number | null
  try {
    priorMtime = await tryAcquireConsolidationLock()
  } catch (e: unknown) {
    const reason = `Failed to acquire dream lock: ${(e as Error).message}`
    logForDebugging(`[autoDream] ${reason}`)
    return { status: 'skipped', reason }
  }
  if (priorMtime === null) {
    return {
      status: 'skipped',
      reason:
        trigger === 'manual'
          ? 'A dream is already running in the background.'
          : 'dream lock already held',
    }
  }

  if (isAutoTrigger) {
    logForDebugging(
      `[autoDream] firing — ${hoursSince.toFixed(1)}h since last, ${sessionIds.length} sessions to review`,
    )
    logEvent('tengu_auto_dream_fired', {
      hours_since: Math.round(hoursSince),
      sessions_since: sessionIds.length,
    })
  } else {
    logForDebugging(
      `[manualDream] starting — ${sessionIds.length} sessions since last consolidation`,
    )
  }

  const setAppState =
    toolUseContext.setAppStateForTasks ?? toolUseContext.setAppState
  const abortController = new AbortController()
  const taskId = registerDreamTask(setAppState, {
    sessionsReviewing: sessionIds.length,
    priorMtime,
    abortController,
  })

  const memoryRoot = getAutoMemPath()
  const transcriptDir = getProjectDir(getOriginalCwd())
  const extra = `

**Tool constraints for this run:** Bash is restricted to read-only commands (\`ls\`, \`find\`, \`grep\`, \`cat\`, \`stat\`, \`wc\`, \`head\`, \`tail\`, and similar). Anything that writes, redirects to a file, or modifies state will be denied. Plan your exploration with this in mind — no need to probe.

Sessions since last consolidation (${sessionIds.length}):
${formatSessionList(sessionIds)}`
  const prompt = buildConsolidationPrompt(memoryRoot, transcriptDir, extra)

  void runDreamAgent({
    taskId,
    trigger,
    cacheSafeParams,
    memoryRoot,
    prompt,
    setAppState,
    toolUseContext,
    appendSystemMessage,
    abortController,
    priorMtime,
    sessionsReviewing: sessionIds.length,
  })

  return {
    status: 'started',
    sessionsReviewing: sessionIds.length,
    taskId,
  }
}

async function runDreamAgent({
  taskId,
  trigger,
  cacheSafeParams,
  memoryRoot,
  prompt,
  setAppState,
  toolUseContext,
  appendSystemMessage,
  abortController,
  priorMtime,
  sessionsReviewing,
}: {
  taskId: string
  trigger: DreamTrigger
  cacheSafeParams: CacheSafeParams
  memoryRoot: string
  prompt: string
  setAppState: import('../../Task.js').SetAppState
  toolUseContext: ToolUseContext
  appendSystemMessage?: AppendSystemMessageFn
  abortController: AbortController
  priorMtime: number
  sessionsReviewing: number
}): Promise<void> {
  try {
    const result = await runForkedAgent({
      promptMessages: [createUserMessage({ content: prompt })],
      cacheSafeParams,
      canUseTool: createAutoMemCanUseTool(memoryRoot),
      querySource: trigger === 'manual' ? 'manual_dream' : 'auto_dream',
      forkLabel: trigger === 'manual' ? 'manual_dream' : 'auto_dream',
      skipTranscript: true,
      overrides: { abortController },
      onMessage: makeDreamProgressWatcher(taskId, setAppState),
    })

    completeDreamTask(taskId, setAppState)
    const dreamState = toolUseContext.getAppState().tasks?.[taskId]
    if (
      appendSystemMessage &&
      isDreamTask(dreamState) &&
      dreamState.filesTouched.length > 0
    ) {
      appendSystemMessage({
        ...createMemorySavedMessage(dreamState.filesTouched),
        verb: 'Improved',
      })
    }

    if (trigger === 'auto') {
      logForDebugging(
        `[autoDream] completed — cache: read=${result.totalUsage.cache_read_input_tokens} created=${result.totalUsage.cache_creation_input_tokens}`,
      )
      logEvent('tengu_auto_dream_completed', {
        cache_read: result.totalUsage.cache_read_input_tokens,
        cache_created: result.totalUsage.cache_creation_input_tokens,
        output: result.totalUsage.output_tokens,
        sessions_reviewed: sessionsReviewing,
      })
    } else {
      logForDebugging(
        `[manualDream] completed — cache: read=${result.totalUsage.cache_read_input_tokens} created=${result.totalUsage.cache_creation_input_tokens}`,
      )
    }
  } catch (e: unknown) {
    if (abortController.signal.aborted) {
      logForDebugging(
        trigger === 'manual' ? '[manualDream] aborted by user' : '[autoDream] aborted by user',
      )
      return
    }
    logForDebugging(
      `${trigger === 'manual' ? '[manualDream]' : '[autoDream]'} fork failed: ${(e as Error).message}`,
    )
    if (trigger === 'auto') {
      logEvent('tengu_auto_dream_failed', {})
    }
    failDreamTask(taskId, setAppState)
    await rollbackConsolidationLock(priorMtime)
  }
}

function formatSessionList(sessionIds: string[]): string {
  if (sessionIds.length === 0) {
    return '- (none)'
  }
  return sessionIds.map(id => `- ${id}`).join('\n')
}

function stripInProgressAssistantMessage(messages: Message[]): Message[] {
  const last = messages.at(-1)
  if (last?.type === 'assistant' && last.message.stop_reason === null) {
    return messages.slice(0, -1)
  }
  return messages
}

async function buildManualDreamCacheSafeParams(
  context: ToolUseContext,
): Promise<CacheSafeParams> {
  const forkContextMessages = getMessagesAfterCompactBoundary(
    stripInProgressAssistantMessage(context.messages),
  )
  const saved = getLastCacheSafeParams()
  if (saved) {
    return {
      systemPrompt: saved.systemPrompt,
      userContext: saved.userContext,
      systemContext: saved.systemContext,
      toolUseContext: context,
      forkContextMessages,
    }
  }

  const additionalWorkingDirectories = Array.from(
    context.getAppState().toolPermissionContext.additionalWorkingDirectories.keys(),
  )
  const [defaultSystemPrompt, userContext, systemContext] = await Promise.all([
    context.options.customSystemPrompt !== undefined
      ? Promise.resolve<string[]>([])
      : getSystemPrompt(
          context.options.tools,
          context.options.mainLoopModel,
          additionalWorkingDirectories,
          context.options.mcpClients,
        ),
    getUserContext(),
    context.options.customSystemPrompt !== undefined
      ? Promise.resolve({})
      : getSystemContext(),
  ])

  return {
    systemPrompt: asSystemPrompt([
      ...(context.options.customSystemPrompt !== undefined
        ? [context.options.customSystemPrompt]
        : defaultSystemPrompt),
      ...(context.options.appendSystemPrompt
        ? [context.options.appendSystemPrompt]
        : []),
    ]),
    userContext,
    systemContext,
    toolUseContext: context,
    forkContextMessages,
  }
}
