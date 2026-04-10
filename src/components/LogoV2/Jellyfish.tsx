import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'

export type JellyfishStatus = 'quiescent' | 'ignited'

type Props = {
  status?: JellyfishStatus
  width?: number
}

export function Jellyfish({ status = 'ignited', width: propWidth }: Props) {
  const { columns } = useTerminalSize()
  const w = propWidth ?? Math.min(columns, 60)

  const bellRows = buildBellRows(status, w)
  const tentacleRows = buildTentacleRows(w)

  return (
    <Box flexDirection="column" alignItems="center" width={w}>
      {bellRows.map((row, i) => (
        <Text key={`b${i}`}>{row}</Text>
      ))}
      {tentacleRows.map((row, i) => (
        <Text key={`t${i}`}>{row}</Text>
      ))}
    </Box>
  )
}

function getBellLines(status: JellyfishStatus): string[] {
  const upperGlow = {
    quiescent: '   ╱oooooooooooooooooooooooooo╲   ',
    ignited: '   ╱ooooo▓▓▓██████████▓▓▓ooooo╲   ',
  }[status]

  const core = {
    quiescent: '│.... · · ....│',
    ignited: '│▓▓██████████████████▓▓│',
  }[status]

  const lowerGlow = {
    quiescent: '   ╲oooooooooooooooooooooooooo╱   ',
    ignited: '   ╲ooooo▓▓▓██████████▓▓▓ooooo╱   ',
  }[status]

  return [
    '       oooooooooooooooo       ',
    '     ╱oooooooooooooooooooooo╲     ',
    upperGlow,
    `   ${core}   `,
    lowerGlow,
    '     ╲ooooooooooooooooooooooo╱     ',
    '       o━━━━━━━━━━━━━━━━━━━━o       ',
  ]
}

function buildBellRows(status: JellyfishStatus, totalWidth: number): React.ReactNode[] {
  const bellLines = getBellLines(status)
  const rows: React.ReactNode[] = []

  for (const line of bellLines) {
    const visible = stringWidth(line)
    const padLeft = Math.floor((totalWidth - visible) / 2)
    const segs = colorizeLine(line, status)
    rows.push(
      <Text>
        {' '.repeat(Math.max(0, padLeft))}
        {segs}
      </Text>
    )
  }
  return rows
}

function colorizeLine(line: string, status: JellyfishStatus): React.ReactNode {
  const segs: React.ReactNode[] = []
  let i = 0

  while (i < line.length) {
    const ch = line[i]!
    if ('o╱╲━─│'.includes(ch)) {
      let s = ''
      while (i < line.length && 'o╱╲━─│'.includes(line[i]!)) { s += line[i++] }
      segs.push(<Text key={`d${i}`} color="jellyfish_body">{s}</Text>)
    } else if (ch === '█') {
      let s = ''
      while (i < line.length && line[i] === '█') { s += line[i++] }
      segs.push(<Text key={`c${i}`} color="jellyfish_core_active" bold>{s}</Text>)
    } else if (ch === '▓') {
      let s = ''
      while (i < line.length && line[i] === '▓') { s += line[i++] }
      const color = status === 'quiescent' ? 'jellyfish_core_dim' : 'jellyfish_core'
      segs.push(<Text key={`h${i}`} color={color} bold>{s}</Text>)
    } else if (ch === '.') {
      let s = ''
      while (i < line.length && line[i] === '.') { s += line[i++] }
      const color = status === 'quiescent' ? 'jellyfish_core_dim' : 'jellyfish_core'
      segs.push(<Text key={`e${i}`} color={color}>{s}</Text>)
    } else if (ch === '·') {
      const color = status === 'quiescent' ? 'jellyfish_core_dim' : 'jellyfish_core_active'
      segs.push(<Text key={`dot${i}`} color={color} bold>·</Text>)
      i++
    } else {
      segs.push(<Text key={`s${i}`}>{ch}</Text>)
      i++
    }
  }

  return <>{segs}</>
}

function buildTentacleRows(totalWidth: number): React.ReactNode[] {
  const lines = [
    '     ╲   │   │   │   │   │   │   ╱     ',
    '      ╲  │   │   │   │   │   │  ╱      ',
    '       ╲ │   │   │   │   │   │ ╱       ',
    '        ╲│   │   │   │   │   │╱        ',
    '    ·    │   │   │   │   │   │    ·    ',
    '         │   │   │   │   │   │          ',
    '         │   │   │   │   │   │          ',
    '    ·    │   │   │   ·   │   │    ·    ',
    '         │   │   │       │   │          ',
    '         │   ·   │       ·   │          ',
    '         │       │           │          ',
    '              ·       ·                  ',
  ]

  return lines.map((line, i) => {
    const segs: React.ReactNode[] = []
    for (const ch of line) {
      if (ch === '╱' || ch === '╲') {
        segs.push(<Text key={`s${segs.length}`} color="jellyfish_tentacle_dim">{ch}</Text>)
      } else if (ch === '│') {
        segs.push(<Text key={`s${segs.length}`} color="jellyfish_tentacle">{ch}</Text>)
      } else if (ch === '·') {
        segs.push(<Text key={`s${segs.length}`} color="jellyfish_core_active" bold>·</Text>)
      } else {
        segs.push(<Text key={`s${segs.length}`}>{ch}</Text>)
      }
    }
    const visible = stringWidth(line)
    const padLeft = Math.floor((totalWidth - visible) / 2)
    return (
      <Text key={`t${i}`}>
        {' '.repeat(Math.max(0, padLeft))}
        {segs}
      </Text>
    )
  })
}

function stringWidth(s: string): number {
  let w = 0
  for (const _ of s) { w++ }
  return w
}
