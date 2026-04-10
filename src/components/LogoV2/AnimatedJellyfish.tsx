import * as React from 'react'
import { useEffect, useState } from 'react'
import { Box, Text } from '../../ink.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import type { JellyfishStatus } from './Jellyfish.js'

const FRAME_MS = 360
const PULSE_MS = 140
const BREATH_SEQUENCE = [0, 1, 2, 1] as const

const JELLYFISH_WIDTH = 38
const JELLYFISH_HEIGHT = 13

type JellyfishFrame = {
  bell: string[]
  tentacles: string[]
}

function getBreathingFrames(status: JellyfishStatus): JellyfishFrame[] {
  const core = status === 'ignited' ? 'OO' : '..'

  return [
    {
      bell: [
        '           .-~~~~~~-.',
        '        .-~  .--.   ~-.',
        `      .~   .  ${core}  .    ~.`,
        '     /   .  ____  .     \\',
        '    |   /  / __ \\  \\     |',
        '     \\  \\  \\____/  /    /',
        "      `-._`-____-`_.-'",
      ],
      tentacles: [
        '            / || \\ ',
        '           /  ||  \\ ',
        '          /   ||   \\ ',
        '              ||',
        '              ||',
        '             /  \\ ',
      ],
    },
    {
      bell: [
        '            .-~~~~-.',
        '         .-~  .--. ~-.',
        `       .~   . ${core} .   ~.`,
        '      /   .  __  .    \\',
        '     |   /  /__\\  \\    |',
        '      \\  \\  \\__/  /   /',
        "       `-._`-__-`_.-'",
      ],
      tentacles: [
        '            / || \\ ',
        '            | || |',
        '            | || |',
        '              ||',
        '              ||',
        '             /  \\ ',
      ],
    },
    {
      bell: [
        '             .-~~-.',
        '          .-~ .--. ~-.',
        `        .~   . ${core} .  ~.`,
        '       /   .  __  .   \\',
        '       \\  /  \\__/  \\  /',
        '        `-._`-__-`_.-`',
        '           `-.__.-`',
      ],
      tentacles: [
        '             / || \\ ',
        '             | || |',
        '             | || |',
        '             | || |',
        '              /  \\ ',
        '              /  \\ ',
      ],
    },
  ]
}

export function AnimatedJellyfish({
  status,
  width,
}: {
  status: JellyfishStatus
  width?: number
}) {
  const [reducedMotion] = useState(() => getInitialSettings().prefersReducedMotion ?? false)
  const [breathTick, setBreathTick] = useState(0)
  const [pulseTick, setPulseTick] = useState(0)
  const { columns } = useTerminalSize()

  useEffect(() => {
    if (reducedMotion) return
    const interval = setInterval(() => {
      setBreathTick(tick => (tick + 1) % BREATH_SEQUENCE.length)
    }, FRAME_MS)
    return () => clearInterval(interval)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion || status === 'quiescent') return
    const interval = setInterval(() => {
      setPulseTick(tick => tick + 1)
    }, PULSE_MS)
    return () => clearInterval(interval)
  }, [reducedMotion, status])

  const frames = getBreathingFrames(status)
  const frameIndex = reducedMotion ? 0 : BREATH_SEQUENCE[breathTick]!
  const frame = frames[frameIndex]!
  const renderWidth = width ?? Math.min(columns, JELLYFISH_WIDTH)

  return (
    <Box flexDirection="column" alignItems="center" width={renderWidth}>
      {frame.bell.map((line, index) => (
        <Text key={`bell-${index}`}>
          {' '.repeat(Math.max(0, Math.floor((renderWidth - line.length) / 2)))}
          <BellLine
            text={line}
            status={status}
            pulseTick={pulseTick}
            reducedMotion={reducedMotion}
          />
        </Text>
      ))}

      {frame.tentacles.map((line, index) => (
        <Text key={`tentacle-${index}`}>
          {' '.repeat(Math.max(0, Math.floor((renderWidth - line.length) / 2)))}
          <TentacleLine text={line} />
        </Text>
      ))}
    </Box>
  )
}

function BellLine({ text, status, pulseTick, reducedMotion }: {
  text: string
  status: JellyfishStatus
  pulseTick: number
  reducedMotion: boolean
}): React.ReactNode {
  const segments: React.ReactNode[] = []
  const pulsePhase = reducedMotion ? 0 : pulseTick % 10
  const isCoreBright = status === 'ignited' ? pulsePhase < 7 : false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if ('.~-/\\|_`()'.includes(ch)) {
      segments.push(<Text key={i} color="jellyfish_body">{ch}</Text>)
    } else if ('oO'.includes(ch)) {
      segments.push(
        <Text key={i} color={resolveCoreColor(status, isCoreBright)} bold>
          {ch}
        </Text>
      )
    } else {
      segments.push(<Text key={i}>{ch}</Text>)
    }
  }

  return <>{segments}</>
}

function TentacleLine({ text }: { text: string }): React.ReactNode {
  const segments: React.ReactNode[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (ch === '|') {
      segments.push(<Text key={i} color="jellyfish_tentacle">{ch}</Text>)
    } else if ('/\\'.includes(ch)) {
      segments.push(<Text key={i} color="jellyfish_tentacle_dim">{ch}</Text>)
    } else {
      segments.push(<Text key={i}>{ch}</Text>)
    }
  }

  return <>{segments}</>
}

function resolveCoreColor(status: JellyfishStatus, isBright: boolean): string {
  if (status === 'quiescent') return 'jellyfish_core_dim'
  return isBright ? 'jellyfish_core_active' : 'jellyfish_core'
}

export { JELLYFISH_WIDTH, JELLYFISH_HEIGHT }
