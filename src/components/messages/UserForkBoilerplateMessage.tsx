import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import { FORK_GLYPH } from '../../constants/figures.js'
import {
  FORK_BOILERPLATE_TAG,
  FORK_DIRECTIVE_PREFIX,
} from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

const FORK_BOILERPLATE_RE = new RegExp(
  `<${FORK_BOILERPLATE_TAG}>[\\s\\S]*?</${FORK_BOILERPLATE_TAG}>\\s*`,
)

function extractForkDirective(text: string): string | null {
  const withoutBoilerplate = text.replace(FORK_BOILERPLATE_RE, '').trim()
  if (!withoutBoilerplate) {
    return null
  }
  if (withoutBoilerplate.startsWith(FORK_DIRECTIVE_PREFIX)) {
    return withoutBoilerplate.slice(FORK_DIRECTIVE_PREFIX.length).trim()
  }
  return withoutBoilerplate
}

export function UserForkBoilerplateMessage({
  addMargin,
  param: { text },
}: Props): React.ReactNode {
  const directive = extractForkDirective(text)
  if (!directive) {
    return null
  }

  return (
    <Box marginTop={addMargin ? 1 : 0}>
      <Text>
        <Text color="suggestion">{FORK_GLYPH}</Text>{' '}
        <Text dimColor>fork directive:</Text> {directive}
      </Text>
    </Box>
  )
}
