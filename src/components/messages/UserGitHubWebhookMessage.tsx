import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import { Ansi, Box, Text } from '../../ink.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

const GITHUB_WEBHOOK_ACTIVITY_TAG = 'github-webhook-activity'
const GITHUB_WEBHOOK_RE = new RegExp(
  `<${GITHUB_WEBHOOK_ACTIVITY_TAG}>\\n?([\\s\\S]*?)\\n?</${GITHUB_WEBHOOK_ACTIVITY_TAG}>`,
  'g',
)

function parseWebhookBodies(text: string): string[] {
  const bodies: string[] = []
  for (const match of text.matchAll(GITHUB_WEBHOOK_RE)) {
    if (match[1] === undefined) {
      continue
    }
    const body = match[1].trim()
    if (body) {
      bodies.push(body)
    }
  }
  return bodies
}

export function UserGitHubWebhookMessage({
  addMargin,
  param: { text },
}: Props): React.ReactNode {
  const bodies = parseWebhookBodies(text)
  if (bodies.length === 0) {
    return null
  }

  return (
    <Box flexDirection="column" marginTop={addMargin ? 1 : 0}>
      {bodies.map((body, index) => (
        <Box
          key={index}
          flexDirection="column"
          marginTop={index === 0 ? 0 : 1}
        >
          <Text>
            <Text color="suggestion">GitHub</Text>
            <Text dimColor> webhook activity</Text>
          </Text>
          <Box paddingLeft={2}>
            <Text>
              <Ansi>{body}</Ansi>
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
