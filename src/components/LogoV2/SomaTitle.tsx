import * as React from 'react'
import { Box, Text } from '../../ink.js'

type Letter = {
  lines: string[]
  color: string
}

const LETTER_GAP = 3

const TITLE_LETTERS: Letter[] = [
  {
    color: 'jellyfish_core',
    lines: [
      '  ______  ',
      ' / ____/  ',
      '/ /___    ',
      '\\___  \\   ',
      '____/ /   ',
      '/_____/   ',
    ],
  },
  {
    color: 'jellyfish_body',
    lines: [
      '   ____   ',
      '  / __ \\  ',
      ' / / / /  ',
      '| | | |   ',
      '| |_| |   ',
      ' \\____/   ',
    ],
  },
  {
    color: 'jellyfish_core_active',
    lines: [
      ' __  __   ',
      '|  \\/  |  ',
      '| \\  / |  ',
      '| |\\/| |  ',
      '| |  | |  ',
      '|_|  |_|  ',
    ],
  },
  {
    color: 'jellyfish_core',
    lines: [
      '     /\\      ',
      '    /  \\     ',
      '   / /\\ \\    ',
      '  / ____ \\   ',
      ' / /    \\ \\  ',
      '/_/      \\_\\ ',
    ],
  },
]

const TITLE_HEIGHT = TITLE_LETTERS[0]!.lines.length
const TITLE_WIDTH = TITLE_LETTERS.reduce((total, letter, index) => {
  const letterWidth = Math.max(...letter.lines.map(line => line.length))
  const gap = index < TITLE_LETTERS.length - 1 ? LETTER_GAP : 0
  return total + letterWidth + gap
}, 0)

type Props = {
  rightPad?: number
  topOffset?: number
}

export function SomaTitle({ rightPad = 2, topOffset = 1 }: Props) {
  return (
    <Box
      position="absolute"
      right={rightPad}
      top={topOffset}
      width={TITLE_WIDTH}
      flexDirection="row"
    >
      {TITLE_LETTERS.map((letter, letterIndex) => {
        const letterWidth = Math.max(...letter.lines.map(line => line.length))
        const marginRight = letterIndex < TITLE_LETTERS.length - 1 ? LETTER_GAP : 0

        return (
          <Box
            key={letterIndex}
            flexDirection="column"
            width={letterWidth}
            marginRight={marginRight}
          >
            {letter.lines.map((line, lineIndex) => (
              <Text key={lineIndex} color={letter.color} bold italic>
                {line}
              </Text>
            ))}
          </Box>
        )
      })}
    </Box>
  )
}

export { TITLE_WIDTH, TITLE_HEIGHT }

