import * as React from 'react'
import { useMemo } from 'react'
import { Box, Text } from '../../ink.js'

type BackgroundRect = {
  left: number
  top: number
  width: number
  height: number
}

type Props = {
  width: number
  height: number
  avoidZones?: BackgroundRect[]
}

type Beam = {
  left: number
  top: number
  width: number
  height: number
}

type Bubble = {
  left: number
  top: number
  char: string
}

type CurrentBand = {
  left: number
  top: number
  lines: string[]
}

type SeaweedCluster = {
  left: number
  lines: string[]
}

type RockShelf = {
  left: number
  lines: string[]
}

type SceneDecor = {
  beams: Beam[]
  bubbles: Bubble[]
  particles: Bubble[]
  currents: CurrentBand[]
  seaweed: SeaweedCluster[]
  rocks: RockShelf[]
}

export function DeepSeaBackground({ width, height, avoidZones = [] }: Props) {
  const scene = useMemo(() => buildScene(width, height, avoidZones), [avoidZones, height, width])

  return (
    <Box position="absolute" left={0} top={0} width={width} height={height}>
      {scene.beams.map((beam, index) => (
        <BeamColumn key={`beam-${index}`} beam={beam} sceneHeight={height} />
      ))}

      {scene.currents.map((band, index) => (
        <Box
          key={`current-${index}`}
          position="absolute"
          left={band.left}
          top={band.top}
          flexDirection="column"
        >
          {band.lines.map((line, lineIndex) => (
            <Text key={lineIndex} color="jellyfish_body_dim">{line}</Text>
          ))}
        </Box>
      ))}

      {scene.particles.map((particle, index) => (
        <Text
          key={`particle-${index}`}
          position="absolute"
          left={particle.left}
          top={particle.top}
          color="jellyfish_tentacle_dim"
        >
          {particle.char}
        </Text>
      ))}

      {scene.bubbles.map((bubble, index) => (
        <Text
          key={`bubble-${index}`}
          position="absolute"
          left={bubble.left}
          top={bubble.top}
          color="jellyfish_core_dim"
        >
          {bubble.char}
        </Text>
      ))}

      {scene.rocks.map((rock, index) => (
        <Box key={`rock-${index}`} position="absolute" left={rock.left} bottom={0} flexDirection="column">
          {rock.lines.map((line, lineIndex) => (
            <Text key={lineIndex} color="jellyfish_body_dim">{line}</Text>
          ))}
        </Box>
      ))}

      {scene.seaweed.map((cluster, index) => (
        <Box key={`seaweed-${index}`} position="absolute" left={cluster.left} bottom={0} flexDirection="column">
          {cluster.lines.map((line, lineIndex) => (
            <Text key={lineIndex} color="jellyfish_tentacle_dim">{line}</Text>
          ))}
        </Box>
      ))}
    </Box>
  )
}

function BeamColumn({ beam, sceneHeight }: { beam: Beam; sceneHeight: number }) {
  const rows: React.ReactNode[] = []
  const height = Math.min(beam.height, sceneHeight)

  for (let row = 0; row < height; row++) {
    rows.push(
      <Text key={row} color="jellyfish_body_dim">
        {':'.repeat(beam.width)}
      </Text>
    )
  }

  return (
    <Box position="absolute" left={beam.left} top={beam.top} flexDirection="column">
      {rows}
    </Box>
  )
}

function buildScene(width: number, height: number, avoidZones: BackgroundRect[]): SceneDecor {
  const beams = buildBeams(width, height, avoidZones)
  const currents = buildCurrents(width, height, avoidZones)
  const bubbles = buildBubbles(width, height, avoidZones)
  const particles = buildParticles(width, height, avoidZones)
  const rocks = buildRocks(width, height, avoidZones)
  const seaweed = buildSeaweed(width, height, avoidZones)

  return { beams, bubbles, particles, currents, seaweed, rocks }
}

function buildBeams(width: number, height: number, avoidZones: BackgroundRect[]): Beam[] {
  const candidates: Beam[] = [
    { left: 4, top: 0, width: 2, height: Math.floor(height * 0.22) },
    { left: Math.floor(width * 0.28), top: 1, width: 2, height: Math.floor(height * 0.26) },
    { left: width - 6, top: 0, width: 2, height: Math.floor(height * 0.2) },
  ]

  return candidates.filter(beam => !intersectsAny(beam.left, beam.top, beam.width, beam.height, avoidZones))
}

function buildCurrents(width: number, height: number, avoidZones: BackgroundRect[]): CurrentBand[] {
  const candidates: CurrentBand[] = [
    {
      left: Math.max(4, Math.floor(width * 0.08)),
      top: Math.max(6, Math.floor(height * 0.22)),
      lines: [
        '~~~~  ~~~~   ~~~~  ~~~~',
        '  ~~~~  ~~~~   ~~~~   ~',
      ],
    },
    {
      left: Math.max(8, Math.floor(width * 0.58)),
      top: Math.max(10, Math.floor(height * 0.36)),
      lines: [
        '~~~   ~~~~   ~~~~   ~~~',
        '  ~~~~   ~~~~   ~~~~',
      ],
    },
    {
      left: Math.max(6, Math.floor(width * 0.62)),
      top: Math.max(14, Math.floor(height * 0.66)),
      lines: [
        '~~ ~~ ~~ ~~ ~~ ~~',
        '  ~~ ~~ ~~ ~~ ~~',
      ],
    },
  ]

  return candidates.filter(band => {
    const blockWidth = Math.max(...band.lines.map(line => line.length))
    return !intersectsAny(band.left, band.top, blockWidth, band.lines.length, avoidZones)
  })
}

function buildBubbles(width: number, height: number, avoidZones: BackgroundRect[]): Bubble[] {
  const xPositions = [4, Math.floor(width * 0.16), Math.floor(width * 0.82), width - 8]
  const bubbles: Bubble[] = []

  xPositions.forEach((left, columnIndex) => {
    for (let top = 5; top < height - 5; top += 5) {
      const char = columnIndex % 2 === 0 ? 'o' : '.'
      if (!intersectsAny(left, top, 1, 1, avoidZones)) {
        bubbles.push({ left, top, char })
      }
    }
  })

  return bubbles
}

function buildParticles(width: number, height: number, avoidZones: BackgroundRect[]): Bubble[] {
  const particles: Bubble[] = []

  for (let top = 4; top < height - 4; top += 4) {
    for (let left = 10; left < width - 10; left += 16) {
      if (!intersectsAny(left, top, 1, 1, avoidZones)) {
        particles.push({ left, top, char: ':' })
      }
    }
  }

  return particles
}

function buildRocks(width: number, height: number, avoidZones: BackgroundRect[]): RockShelf[] {
  const candidates: RockShelf[] = [
    {
      left: 0,
      lines: [
        '   ________',
        ' _/_______/',
      ],
    },
    {
      left: width - 14,
      lines: [
        '________   ',
        '\\_______\\_ ',
      ],
    },
  ]

  return candidates.filter(rock => {
    const blockWidth = Math.max(...rock.lines.map(line => line.length))
    const top = height - rock.lines.length
    return !intersectsAny(rock.left, top, blockWidth, rock.lines.length, avoidZones)
  })
}

function buildSeaweed(width: number, height: number, avoidZones: BackgroundRect[]): SeaweedCluster[] {
  const candidates: SeaweedCluster[] = [
    {
      left: 2,
      lines: [
        '   /|',
        '  /||',
        ' / ||',
        '   ||',
        '   ||',
      ],
    },
    {
      left: 10,
      lines: [
        '   \\|',
        '   ||',
        '  /||',
        '   ||',
        '   ||',
      ],
    },
    {
      left: width - 12,
      lines: [
        '   /|',
        '  /||',
        ' / ||',
        '   ||',
        '   ||',
      ],
    },
    {
      left: width - 8,
      lines: [
        '  /|',
        ' /||',
        '  ||',
        '  ||',
      ],
    },
  ]

  return candidates.filter(cluster => {
    const blockWidth = Math.max(...cluster.lines.map(line => line.length))
    const top = height - cluster.lines.length
    return !intersectsAny(cluster.left, top, blockWidth, cluster.lines.length, avoidZones)
  })
}

function intersectsAny(
  left: number,
  top: number,
  width: number,
  height: number,
  zones: BackgroundRect[],
) {
  return zones.some(zone => intersects(left, top, width, height, zone))
}

function intersects(
  left: number,
  top: number,
  width: number,
  height: number,
  zone: BackgroundRect,
) {
  const right = left + width
  const bottom = top + height
  const zoneRight = zone.left + zone.width
  const zoneBottom = zone.top + zone.height

  return left < zoneRight && right > zone.left && top < zoneBottom && bottom > zone.top
}

export type { BackgroundRect }
