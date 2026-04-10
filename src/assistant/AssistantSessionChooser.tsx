import * as React from 'react'
import { useKeybinding } from '../keybindings/useKeybinding.js'
import { Box, Text } from '../ink.js'
import { Dialog } from '../components/design-system/Dialog.js'
import type { AssistantSession } from './sessionDiscovery.js'

type Props = {
  sessions: AssistantSession[]
  onSelect: (id: string) => void
  onCancel: () => void
}

export function AssistantSessionChooser({
  sessions,
  onSelect,
  onCancel,
}: Props): React.ReactNode {
  const firstSessionId = sessions[0]?.id

  useKeybinding(
    'confirm:yes',
    () => {
      if (firstSessionId) {
        onSelect(firstSessionId)
      }
    },
    { context: 'Confirmation', isActive: firstSessionId !== undefined },
  )

  return (
    <Dialog
      title="Assistant Session Chooser"
      subtitle="Compatibility chooser for the reconstructed snapshot"
      onCancel={onCancel}
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          The full assistant session picker is not available in this
          reconstructed snapshot.
        </Text>
        {sessions.length === 0 ? (
          <Text dimColor>No assistant sessions were discovered.</Text>
        ) : (
          <>
            <Text dimColor>
              Press Enter to attach to the first discovered session, or Esc to
              cancel.
            </Text>
            {sessions.map(session => (
              <Text key={session.id}>- {session.title ?? session.id}</Text>
            ))}
          </>
        )}
      </Box>
    </Dialog>
  )
}
