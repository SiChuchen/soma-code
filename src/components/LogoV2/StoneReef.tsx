import * as React from 'react'
import { useMemo } from 'react'
import { Box, Text } from '../../ink.js'

type Props = {
  children: React.ReactNode
  left: number
  top: number
  maxWidth: number
  contentHeight: number
}

/**
 * ASCII art stone/rock formation that wraps content (InfoPanel + FeedColumn).
 *
 * Border uses ▓ for outer shell, ▒ for inner padding.
 * Content is rendered inside the stone frame.
 *
 * Example:
 *   ╭▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓╮
 *   ▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▓
 *   ▓▒  content lines here...  ▒▓
 *   ▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▓
 *   ╰▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓╯
 */
export function StoneReef({ children, left, top, maxWidth, contentHeight }: Props) {
  const innerWidth = maxWidth - 4 // 2 chars padding each side (▓▒ ... ▒▓)
  const outerWidth = maxWidth

  const rows = useMemo(() => buildBorderRows(outerWidth, innerWidth, contentHeight), [outerWidth, innerWidth, contentHeight])

  return (
    <Box
      position="absolute"
      left={left}
      top={top}
      width={outerWidth}
      flexDirection="column"
    >
      {/* Top cap */}
      <Text>
        <Text color="jellyfish_body_dim">{rows.top}</Text>
      </Text>
      {/* Inner padding top */}
      <Text>
        <Text color="jellyfish_body_dim">{rows.padLeft}</Text>
        <Text color="jellyfish_body_dim">{'░'.repeat(innerWidth)}</Text>
        <Text color="jellyfish_body_dim">{rows.padRight}</Text>
      </Text>
      {/* Content area — use a row with stone borders on sides */}
      <Box flexDirection="row" width={outerWidth}>
        {/* Left border column */}
        <Box flexDirection="column" width={2}>
          {Array.from({ length: contentHeight }, (_, i) => (
            <Text key={`l${i}`} color="jellyfish_body_dim">
              {'▓▒'}
            </Text>
          ))}
        </Box>
        {/* Content */}
        <Box flexDirection="column" width={innerWidth}>
          {children}
        </Box>
        {/* Right border column */}
        <Box flexDirection="column" width={2}>
          {Array.from({ length: contentHeight }, (_, i) => (
            <Text key={`r${i}`} color="jellyfish_body_dim">
              {'▒▓'}
            </Text>
          ))}
        </Box>
      </Box>
      {/* Inner padding bottom */}
      <Text>
        <Text color="jellyfish_body_dim">{rows.padLeft}</Text>
        <Text color="jellyfish_body_dim">{'░'.repeat(innerWidth)}</Text>
        <Text color="jellyfish_body_dim">{rows.padRight}</Text>
      </Text>
      {/* Bottom cap */}
      <Text>
        <Text color="jellyfish_body_dim">{rows.bottom}</Text>
      </Text>
    </Box>
  )
}

function buildBorderRows(outerWidth: number, innerWidth: number, _contentHeight: number) {
  const innerFill = '▓'.repeat(innerWidth)
  return {
    top: `╭${innerFill}╮`,
    padLeft: '▓▒',
    padRight: '▒▓',
    bottom: `╰${innerFill}╯`,
  }
}
