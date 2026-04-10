import React, { useCallback, useMemo, useRef, useState } from 'react'
import type { UUID } from 'crypto'
import type { AppState } from '../state/AppState.js'
import { useAppState, useSetAppState } from '../state/AppState.js'
import { useRegisterOverlay } from '../context/overlayContext.js'
import { Box, Text } from '../ink.js'
import ScrollBox, { type ScrollBoxHandle } from '../ink/components/ScrollBox.js'
import type { RemoteAgentTaskState } from '../tasks/RemoteAgentTask/RemoteAgentTask.js'
import { AGENT_TOOL_NAME } from '../tools/AgentTool/constants.js'
import { TEAM_CREATE_TOOL_NAME } from '../tools/TeamCreateTool/constants.js'
import { errorMessage } from '../utils/errors.js'
import { isEnvTruthy } from '../utils/envUtils.js'
import { createUserMessage } from '../utils/messages.js'
import { isAgentSwarmsEnabled } from '../utils/agentSwarmsEnabled.js'
import { getTranscriptPath } from '../utils/sessionStorage.js'
import { updateTaskState } from '../utils/task/framework.js'
import { archiveRemoteSession } from '../utils/teleport.js'
import { type OptionWithDescription, Select } from './CustomSelect/select.js'
import { PermissionDialog } from './permissions/PermissionDialog.js'
import { ScrollKeybindingHandler } from './ScrollKeybindingHandler.js'

type UltraplanLaunchChoice = 'launch' | 'cancel'
type UltraplanImplementationChoice = 'current' | 'fresh'

type UltraplanLaunchDialogProps = {
  onChoice: (
    choice: UltraplanLaunchChoice,
    opts?: {
      disconnectedBridge?: boolean
    },
  ) => void
}

type UltraplanChoiceDialogProps = {
  plan: string
  sessionId: string
  taskId: string
  // Passed from REPL for parity with the original callsite. The recovered
  // dialog now routes through AppState.initialMessage, so it does not need
  // to clear the conversation directly.
  setMessages: unknown
  readFileState: unknown
  getAppState: () => AppState
  setConversationId: (id: UUID) => void
}

const PLAN_PREVIEW_MIN_HEIGHT = 8
const PLAN_PREVIEW_MAX_HEIGHT = 14

function buildUltraplanImplementationPrompt(
  plan: string,
  clearContext: boolean,
): { content: string; shouldStorePlanForVerification: boolean } {
  const shouldStorePlanForVerification =
    process.env.USER_TYPE === 'ant' &&
    isEnvTruthy(process.env.CLAUDE_CODE_VERIFY_PLAN)

  const verificationInstruction = shouldStorePlanForVerification
    ? `\n\nIMPORTANT: When you have finished implementing the plan, you MUST call the "VerifyPlanExecution" tool directly (NOT the ${AGENT_TOOL_NAME} tool or an agent) to trigger background verification.`
    : ''
  const transcriptHint = clearContext
    ? `\n\nIf you need details from the current session while implementing, read the full transcript at: ${getTranscriptPath()}`
    : ''
  const teamHint = isAgentSwarmsEnabled()
    ? `\n\nIf this plan can be broken down into multiple independent tasks, consider using the ${TEAM_CREATE_TOOL_NAME} tool to parallelize the work.`
    : ''

  return {
    content: `Implement the following plan:\n\n${plan}${verificationInstruction}${transcriptHint}${teamHint}`,
    shouldStorePlanForVerification,
  }
}

export function UltraplanLaunchDialog({
  onChoice,
}: UltraplanLaunchDialogProps): React.ReactNode {
  useRegisterOverlay('ultraplan-launch-dialog')

  const setAppState = useSetAppState()
  const replBridgeConnected = useAppState(s => s.replBridgeConnected)
  const replBridgeEnabled = useAppState(s => s.replBridgeEnabled)
  const replBridgeOutboundOnly = useAppState(s => s.replBridgeOutboundOnly)

  const bridgeIsActive =
    (replBridgeConnected || replBridgeEnabled) && !replBridgeOutboundOnly

  const options = useMemo<OptionWithDescription<UltraplanLaunchChoice>[]>(
    () => [
      {
        label: bridgeIsActive
          ? 'Disconnect and launch'
          : 'Launch Ultraplan',
        description: bridgeIsActive
          ? 'Remote Control will be disconnected before somacode on the web starts planning.'
          : 'Start a somacode on the web planning session in the background.',
        value: 'launch',
      },
      {
        label: 'Cancel',
        description: 'Return to the current session without starting Ultraplan.',
        value: 'cancel',
      },
    ],
    [bridgeIsActive],
  )

  const handleCancel = useCallback((): void => {
    onChoice('cancel')
  }, [onChoice])

  const handleSelect = useCallback(
    (value: UltraplanLaunchChoice): void => {
      if (value === 'cancel') {
        onChoice('cancel')
        return
      }

      if (bridgeIsActive) {
        setAppState(prev =>
          !prev.replBridgeEnabled &&
          !prev.replBridgeConnected &&
          !prev.replBridgeExplicit
            ? prev
            : {
                ...prev,
                replBridgeEnabled: false,
                replBridgeExplicit: false,
                replBridgeOutboundOnly: false,
              },
        )
      }

      onChoice('launch', bridgeIsActive ? { disconnectedBridge: true } : undefined)
    },
    [bridgeIsActive, onChoice, setAppState],
  )

  return (
    <PermissionDialog title="Launch Ultraplan" subtitle="somacode on the web">
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box marginBottom={1} flexDirection="column">
          <Text>
            Ultraplan sends your prompt to somacode on the web, where it can
            spend longer refining a multi-step implementation plan in the
            background.
          </Text>
          <Text> </Text>
          <Text>
            Your local terminal stays free while the remote session plans.
          </Text>
          {bridgeIsActive ? (
            <>
              <Text> </Text>
              <Text color="warning">
                Remote Control is active. Launching Ultraplan will disconnect it
                first.
              </Text>
            </>
          ) : null}
        </Box>
        <Select
          options={options}
          inlineDescriptions
          onChange={handleSelect}
          onCancel={handleCancel}
        />
      </Box>
    </PermissionDialog>
  )
}

export function UltraplanChoiceDialog(
  props: UltraplanChoiceDialogProps,
): React.ReactNode {
  useRegisterOverlay('ultraplan-choice-dialog')

  const { plan, sessionId, taskId } = props
  const setAppState = useSetAppState()
  const [isApplyingChoice, setIsApplyingChoice] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollBoxHandle | null>(null)

  const planPreviewHeight = useMemo(() => {
    const lineCount = plan.split('\n').length
    return Math.max(
      PLAN_PREVIEW_MIN_HEIGHT,
      Math.min(PLAN_PREVIEW_MAX_HEIGHT, lineCount + 1),
    )
  }, [plan])

  const options = useMemo<OptionWithDescription<UltraplanImplementationChoice>[]>(
    () => [
      {
        label: 'Implement here',
        description:
          'Keep the current local conversation context and continue with this approved plan.',
        value: 'current',
      },
      {
        label: 'Start fresh session',
        description:
          'Clear the local conversation first, then implement the approved plan in a new session.',
        value: 'fresh',
      },
    ],
    [],
  )

  const handleSelect = useCallback(
    async (value: UltraplanImplementationChoice): Promise<void> => {
      const clearContext = value === 'fresh'
      setIsApplyingChoice(true)
      setApplyError(null)

      try {
        await archiveRemoteSession(sessionId)

        const {
          content,
          shouldStorePlanForVerification,
        } = buildUltraplanImplementationPrompt(plan, clearContext)

        setAppState(prev => ({
          ...prev,
          ultraplanPendingChoice:
            prev.ultraplanPendingChoice?.sessionId === sessionId
              ? undefined
              : prev.ultraplanPendingChoice,
          ultraplanSessionUrl: undefined,
          ultraplanLaunching: undefined,
          initialMessage: {
            message: {
              ...createUserMessage({ content }),
              planContent: plan,
            },
            clearContext,
          },
          ...(shouldStorePlanForVerification
            ? {
                pendingPlanVerification: {
                  plan,
                  verificationStarted: false,
                  verificationCompleted: false,
                },
              }
            : {}),
        }))

        updateTaskState<RemoteAgentTaskState>(taskId, setAppState, task =>
          task.status === 'completed'
            ? task
            : {
                ...task,
                status: 'completed',
                endTime: Date.now(),
              },
        )
      } catch (error) {
        setApplyError(`Failed to prepare local implementation: ${errorMessage(error)}`)
        setIsApplyingChoice(false)
      }
    },
    [plan, sessionId, setAppState, taskId],
  )

  return (
    <PermissionDialog
      title="Ultraplan Ready"
      subtitle="Choose how to continue locally"
    >
      <ScrollKeybindingHandler
        scrollRef={scrollRef}
        isActive={!isApplyingChoice}
        isModal
      />
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box marginBottom={1} flexDirection="column">
          <Text>
            somacode on the web approved a plan for local execution.
          </Text>
          <Text dimColor>
            Review the plan below, then choose whether to continue in this
            session or start from a fresh local context.
          </Text>
        </Box>

        <Box marginBottom={1} flexDirection="column">
          <Text bold>Plan</Text>
          <Text dimColor>
            Scroll with the mouse wheel or <Text bold>Ctrl+U</Text> /{' '}
            <Text bold>Ctrl+D</Text>.
          </Text>
        </Box>

        <Box marginBottom={1} height={planPreviewHeight} flexDirection="column">
          <ScrollBox ref={scrollRef} flexDirection="column">
            <Text wrap="wrap">{plan}</Text>
          </ScrollBox>
        </Box>

        {applyError ? (
          <Box marginBottom={1}>
            <Text color="error">{applyError}</Text>
          </Box>
        ) : null}

        {isApplyingChoice ? (
          <Text dimColor>Preparing local implementation…</Text>
        ) : (
          <Select options={options} inlineDescriptions onChange={handleSelect} />
        )}
      </Box>
    </PermissionDialog>
  )
}
