import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import { INJECTED_ARROW } from '../../constants/figures.js'
import { CROSS_SESSION_MESSAGE_TAG } from '../../constants/xml.js'
import { Ansi, Box, Text } from '../../ink.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

type ParsedCrossSessionMessage = {
  from: string
  content: string
}

const CROSS_SESSION_MESSAGE_RE = new RegExp(
  `<${CROSS_SESSION_MESSAGE_TAG}\\s+from="([^"]+)">\\n?([\\s\\S]*?)\\n?</${CROSS_SESSION_MESSAGE_TAG}>`,
  'g',
)

function parseCrossSessionMessages(text: string): ParsedCrossSessionMessage[] {
  const messages: ParsedCrossSessionMessage[] = []
  for (const match of text.matchAll(CROSS_SESSION_MESSAGE_RE)) {
    if (!match[1] || match[2] === undefined) {
      continue
    }
    messages.push({
      from: match[1],
      content: match[2].trim(),
    })
  }
  return messages
}

export function UserCrossSessionMessage({
  addMargin,
  param: { text },
}: Props): React.ReactNode {
  const messages = parseCrossSessionMessages(text)
  if (messages.length === 0) {
    return null
  }

  return (
    <Box flexDirection="column" marginTop={addMargin ? 1 : 0}>
      {messages.map((message, index) => (
        <Box
          key={`${message.from}-${index}`}
          flexDirection="column"
          marginTop={index === 0 ? 0 : 1}
        >
          <Text>
            <Text color="suggestion">{INJECTED_ARROW}</Text>{' '}
            <Text dimColor>from {message.from}</Text>
          </Text>
          <Box paddingLeft={2}>
            <Text>
              <Ansi>{message.content}</Ansi>
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
