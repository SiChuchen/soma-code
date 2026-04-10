import React from 'react'
import type { DeepImmutable } from 'src/types/utils.js'
import { useElapsedTime } from '../../hooks/useElapsedTime.js'
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js'
import { Box, Text } from '../../ink.js'
import { useKeybindings } from '../../keybindings/useKeybinding.js'
import type { MonitorMcpTaskState } from '../../tasks/MonitorMcpTask/MonitorMcpTask.js'
import { Byline } from '../design-system/Byline.js'
import { Dialog } from '../design-system/Dialog.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'

type Props = {
  task: DeepImmutable<MonitorMcpTaskState>
  onBack?: () => void
  onKill?: () => void
}

export function MonitorMcpDetailDialog({
  task,
  onBack,
  onKill,
}: Props): React.ReactNode {
  const elapsedTime = useElapsedTime(
    task.startTime,
    task.status === 'running',
    1000,
    0,
  )

  useKeybindings(
    {
      'confirm:yes': () => {
        onBack?.()
      },
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
      onBack?.()
      return
    }

    if (event.key === 'left' && onBack) {
      event.preventDefault()
      onBack()
      return
    }

    if (event.key === 'x' && task.status === 'running' && onKill) {
      event.preventDefault()
      onKill()
    }
  }

  return (
    <Box flexDirection="column" tabIndex={0} autoFocus onKeyDown={handleKeyDown}>
      <Dialog
        title="Monitor details"
        subtitle={
          <Text dimColor>
            {elapsedTime} · {task.status}
          </Text>
        }
        onCancel={() => onBack?.()}
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
              {task.status === 'running' && onKill ? (
                <KeyboardShortcutHint shortcut="x" action="stop" />
              ) : null}
            </Byline>
          )
        }
      >
        <Box flexDirection="column" gap={1}>
          <Text bold>Description:</Text>
          <Text>{task.description}</Text>
          <Text bold>Status:</Text>
          <Text>{task.status}</Text>
          <Text bold>Output File:</Text>
          <Text>{task.outputFile}</Text>
          <Text dimColor>
            Monitor MCP event streaming was not recovered in this snapshot. This
            dialog preserves task visibility and stop controls only.
          </Text>
        </Box>
      </Dialog>
    </Box>
  )
}
