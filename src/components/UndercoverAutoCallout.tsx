import React, { useCallback, useEffect } from 'react'
import { Box, Text } from '../ink.js'
import { saveGlobalConfig } from '../utils/config.js'
import { Select, type OptionWithDescription } from './CustomSelect/select.js'
import { PermissionDialog } from './permissions/PermissionDialog.js'

type Props = {
  onDone: () => void
}

type Selection = 'ack'

export function UndercoverAutoCallout({ onDone }: Props): React.ReactNode {
  useEffect(() => {
    saveGlobalConfig(current => {
      if (current.hasSeenUndercoverAutoNotice) {
        return current
      }
      return {
        ...current,
        hasSeenUndercoverAutoNotice: true,
      }
    })
  }, [])

  const handleDone = useCallback((): void => {
    onDone()
  }, [onDone])

  const options: OptionWithDescription<Selection>[] = [
    {
      label: 'Got it',
      description:
        'Keep commit messages and PR text free of provider-internal details.',
      value: 'ack',
    },
  ]

  return (
    <PermissionDialog title="Public Mode">
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box marginBottom={1} flexDirection="column">
          <Text>
            somacode enabled Public Mode automatically for this repository.
          </Text>
          <Text> </Text>
          <Text>
            Treat commit messages, PR titles, and PR bodies as public-facing.
            Do not mention AI attribution, model names, provider names, or
            internal-only details.
          </Text>
        </Box>
        <Select options={options} onChange={handleDone} onCancel={handleDone} />
      </Box>
    </PermissionDialog>
  )
}
