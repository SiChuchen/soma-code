import React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { useElapsedTime } from '../../hooks/useElapsedTime.js'
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js'
import { Box, Text } from '../../ink.js'
import { useKeybindings } from '../../keybindings/useKeybinding.js'
import type {
  LocalWorkflowTaskState,
  LocalWorkflowAgentState,
} from '../../tasks/LocalWorkflowTask/LocalWorkflowTask.js'
import type { AgentId } from '../../types/ids.js'
import type { DeepImmutable } from '../../types/utils.js'
import { plural } from '../../utils/stringUtils.js'
import { Byline } from '../design-system/Byline.js'
import { Dialog } from '../design-system/Dialog.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'

type Props = {
  workflow: DeepImmutable<LocalWorkflowTaskState>
  onDone: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
    },
  ) => void
  onKill?: () => void
  onSkipAgent?: (agentId: AgentId) => void
  onRetryAgent?: (agentId: AgentId) => void
  onBack?: () => void
}

function renderAgent(agent: DeepImmutable<LocalWorkflowAgentState>): string {
  const label = agent.label || agent.agentId
  const detail = agent.summary ?? agent.error
  return detail ? `${label} · ${agent.status} · ${detail}` : `${label} · ${agent.status}`
}

export function WorkflowDetailDialog({
  workflow,
  onDone,
  onKill,
  onSkipAgent,
  onRetryAgent,
  onBack,
}: Props): React.ReactNode {
  const elapsedTime = useElapsedTime(
    workflow.startTime,
    workflow.status === 'running',
    1000,
    0,
  )

  const handleClose = () =>
    onDone('Workflow details dismissed', {
      display: 'system',
    })

  useKeybindings(
    {
      'confirm:yes': handleClose,
    },
    { context: 'Confirmation' },
  )

  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      event.key === 'escape' ||
      event.key === 'enter' ||
      event.key === 'space'
    ) {
      event.preventDefault()
      handleClose()
      return
    }

    if (event.key === 'left' && onBack) {
      event.preventDefault()
      onBack()
      return
    }

    if (event.key === 'x' && workflow.status === 'running' && onKill) {
      event.preventDefault()
      onKill()
    }
  }

  const title = workflow.workflowName ?? 'Workflow details'
  const subtitle = (
    <Text dimColor>
      {elapsedTime} · {workflow.status} · {workflow.agentCount}{' '}
      {plural(workflow.agentCount, 'agent')}
    </Text>
  )

  return (
    <Box flexDirection="column" tabIndex={0} autoFocus onKeyDown={handleKeyDown}>
      <Dialog
        title={title}
        subtitle={subtitle}
        onCancel={handleClose}
        color="background"
        inputGuide={exitState =>
          exitState.pending ? (
            <Text>Press {exitState.keyName} again to exit</Text>
          ) : (
            <Byline>
              {onBack ? (
                <KeyboardShortcutHint shortcut="←" action="go back" />
              ) : null}
              <KeyboardShortcutHint shortcut="Esc/Enter/Space" action="close" />
              {workflow.status === 'running' && onKill ? (
                <KeyboardShortcutHint shortcut="x" action="stop" />
              ) : null}
            </Byline>
          )
        }
      >
        <Box flexDirection="column" gap={1}>
          <Text bold>Description:</Text>
          <Text>{workflow.description}</Text>
          {workflow.summary ? (
            <>
              <Text bold>Summary:</Text>
              <Text>{workflow.summary}</Text>
            </>
          ) : null}
          <Text bold>Status:</Text>
          <Text>{workflow.status}</Text>
          <Text bold>Output File:</Text>
          <Text>{workflow.outputFile}</Text>
          <Text bold>Agents:</Text>
          <Text>
            {workflow.agentCount} {plural(workflow.agentCount, 'agent')}
          </Text>
          {workflow.agentStates?.length ? (
            <Box flexDirection="column">
              {workflow.agentStates.map(agent => (
                <Text key={agent.agentId}>{renderAgent(agent)}</Text>
              ))}
            </Box>
          ) : (
            <Text dimColor>No per-agent state was recovered for this workflow.</Text>
          )}
          <Text dimColor>
            Workflow execution and per-agent controls were not recovered in this
            snapshot. This dialog preserves task visibility and stop controls
            only.
          </Text>
          {onSkipAgent || onRetryAgent ? (
            <Text dimColor>
              Skip/retry callbacks are wired for compatibility, but interactive
              per-agent controls were not reconstructed.
            </Text>
          ) : null}
        </Box>
      </Dialog>
    </Box>
  )
}
