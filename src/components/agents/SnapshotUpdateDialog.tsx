import React, { useCallback, useMemo, useState } from 'react'
import { type AgentMemoryScope, getAgentMemoryDir } from '../../tools/AgentTool/agentMemory.js'
import {
  getSnapshotDirForAgent,
  markSnapshotSynced,
  replaceFromSnapshot,
} from '../../tools/AgentTool/agentMemorySnapshot.js'
import { Box, Text } from '../../ink.js'
import { Select, type OptionWithDescription } from '../CustomSelect/select.js'
import { Dialog } from '../design-system/Dialog.js'
import { Spinner } from '../Spinner.js'

type SnapshotUpdateChoice = 'merge' | 'keep' | 'replace'

type Props = {
  agentType: string
  scope: AgentMemoryScope
  snapshotTimestamp: string
  onComplete: (choice: SnapshotUpdateChoice) => void
  onCancel: () => void
}

function getScopeLabel(scope: AgentMemoryScope): string {
  switch (scope) {
    case 'user':
      return 'user'
    case 'project':
      return 'project'
    case 'local':
      return 'local'
  }
}

export function buildMergePrompt(
  agentType: string,
  scope: AgentMemoryScope,
): string {
  const snapshotDir = getSnapshotDirForAgent(agentType)
  const localDir = getAgentMemoryDir(agentType, scope)

  return `A newer project snapshot is available for the "${agentType}" agent's ${getScopeLabel(
    scope,
  )}-scope memory.

Review the markdown files in:
- Snapshot source: ${snapshotDir}
- Local memory destination: ${localDir}

Merge the relevant snapshot updates into the local memory files. Keep the local memory directory as the source of truth, preserve useful local-only notes, and avoid blindly overwriting valid local context.`
}

export function SnapshotUpdateDialog({
  agentType,
  scope,
  snapshotTimestamp,
  onComplete,
  onCancel,
}: Props): React.ReactNode {
  const [busyChoice, setBusyChoice] = useState<SnapshotUpdateChoice | null>(
    null,
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const snapshotDir = getSnapshotDirForAgent(agentType)
  const localDir = getAgentMemoryDir(agentType, scope)

  const options = useMemo<OptionWithDescription<SnapshotUpdateChoice>[]>(
    () => [
      {
        label: 'Merge snapshot into local memory',
        description:
          'Keep your local files, then inject a merge prompt into this session.',
        value: 'merge',
      },
      {
        label: 'Keep local memory as-is',
        description:
          'Dismiss this snapshot update and keep the current local files.',
        value: 'keep',
      },
      {
        label: 'Replace local memory with snapshot',
        description:
          'Overwrite the local markdown memory files with the project snapshot.',
        value: 'replace',
      },
    ],
    [],
  )

  const handleSelect = useCallback(
    async (choice: SnapshotUpdateChoice): Promise<void> => {
      setBusyChoice(choice)
      setErrorMessage(null)

      try {
        if (choice === 'replace') {
          await replaceFromSnapshot(agentType, scope, snapshotTimestamp)
        } else {
          await markSnapshotSynced(agentType, scope, snapshotTimestamp)
        }

        onComplete(choice)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown snapshot error'
        setErrorMessage(`Failed to apply snapshot choice: ${message}`)
        setBusyChoice(null)
      }
    },
    [agentType, onComplete, scope, snapshotTimestamp],
  )

  const handleCancel = useCallback((): void => {
    if (busyChoice !== null) {
      return
    }
    onCancel()
  }, [busyChoice, onCancel])

  return (
    <Dialog
      title="Agent Memory Update"
      subtitle={`A newer snapshot was found for ${agentType}`}
      onCancel={handleCancel}
      color="background"
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          Snapshot timestamp: <Text bold>{snapshotTimestamp}</Text>
        </Text>
        <Text>
          Scope: <Text bold>{getScopeLabel(scope)}</Text>
        </Text>
        <Text dimColor>Snapshot source: {snapshotDir}</Text>
        <Text dimColor>Local memory: {localDir}</Text>
        {errorMessage ? <Text color="error">{errorMessage}</Text> : null}
        {busyChoice ? (
          <Box>
            <Spinner />
            <Text> Applying {busyChoice} choice…</Text>
          </Box>
        ) : (
          <Select
            options={options}
            onChange={choice => void handleSelect(choice)}
            onCancel={handleCancel}
            layout="compact-vertical"
          />
        )}
      </Box>
    </Dialog>
  )
}
