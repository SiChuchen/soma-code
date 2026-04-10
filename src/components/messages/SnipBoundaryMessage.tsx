import * as React from 'react'
import { BLACK_CIRCLE } from '../../constants/figures.js'
import { Box, Text } from '../../ink.js'
import type { SystemSnipBoundaryMessage } from '../../types/message.js'

type Props = {
  message: SystemSnipBoundaryMessage
}

export function SnipBoundaryMessage({ message }: Props): React.ReactNode {
  const details: string[] = []

  if (message.snipMetadata?.removedMessages) {
    details.push(`${message.snipMetadata.removedMessages} hidden`)
  }
  if (message.snipMetadata?.tokensFreed) {
    details.push(`~${message.snipMetadata.tokensFreed} tokens saved`)
  }

  return (
    <Box marginY={1}>
      <Text dimColor>
        {BLACK_CIRCLE}{' '}
        {message.content || 'Earlier context snipped'}
        {details.length > 0 ? ` (${details.join(', ')})` : ''}
      </Text>
    </Box>
  )
}
