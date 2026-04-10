import React from 'react'
import { Box, Text } from '../../ink.js'
import { useAppState } from '../../state/AppState.js'
import { getWebBrowserUnavailableMessage } from './runtime.js'

export function WebBrowserPanel(): React.ReactNode {
  const bagelActive = useAppState(s => s.bagelActive === true)
  const bagelPanelVisible = useAppState(s => s.bagelPanelVisible ?? true)
  const bagelUrl = useAppState(s => s.bagelUrl)

  if (!bagelActive || !bagelPanelVisible) {
    return null
  }

  return (
    <Box
      borderStyle="round"
      flexDirection="column"
      marginTop={1}
      paddingX={1}
      width="100%"
    >
      <Text color="cyan">Web Browser</Text>
      <Text>{bagelUrl ?? 'No page loaded yet.'}</Text>
      <Text dimColor>{getWebBrowserUnavailableMessage()}</Text>
    </Box>
  )
}
