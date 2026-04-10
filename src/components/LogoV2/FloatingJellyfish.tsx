import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Box } from '../../ink.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import { AnimatedJellyfish } from './AnimatedJellyfish.js'
import type { JellyfishStatus } from './Jellyfish.js'

/** Approximate jellyfish bounding box (chars). */
const JELLYFISH_WIDTH = 42
const JELLYFISH_HEIGHT = 17 // 7 bell + 10 tentacles

/**
 * Movement tick interval (ms).
 * Matches AnimatedJellyfish swim cycle: 4 frames × 320ms = 1280ms per cycle.
 * We tick at swim-frame rate so position change syncs with body contraction.
 */
const TICK_MS = 320

type Props = {
  status: JellyfishStatus
  containerWidth: number
  containerHeight: number
  minLeft?: number
  maxLeft?: number
  minTop?: number
  maxTop?: number
}

/**
 * Wraps AnimatedJellyfish with absolute positioning and propulsion-based drift.
 *
 * Real jellyfish locomotion:
 *   Bell contracts → thrust forward (big position step)
 *   Bell expands  → coast / slight drift (small position step)
 *
 * We synchronize with AnimatedJellyfish's 4-frame swim cycle:
 *   Frame 0 (expanded)     → coast (dx 0~1, gentle)
 *   Frame 1 (contracting)  → accelerate (dx 1~2)
 *   Frame 2 (contracted)   → THRUST (dx 3~5, main propulsion)
 *   Frame 3 (expanding)    → decelerate (dx 1~2)
 *
 * Direction changes gradually via gentle sinusoidal wobble.
 * Respects prefersReducedMotion (static position, no drift).
 */
export function FloatingJellyfish({
  status,
  containerWidth,
  containerHeight,
  minLeft,
  maxLeft,
  minTop,
  maxTop,
}: Props) {
  const [reducedMotion] = useState(() => getInitialSettings().prefersReducedMotion ?? false)
  const horizontalBounds = resolveBounds(minLeft, maxLeft, containerWidth, JELLYFISH_WIDTH)
  const verticalBounds = resolveBounds(minTop, maxTop, containerHeight, JELLYFISH_HEIGHT)

  const [left, setLeft] = useState(() => midpoint(horizontalBounds.min, horizontalBounds.max))
  const [top, setTop] = useState(() => midpoint(verticalBounds.min, verticalBounds.max))

  // Phase counter — synchronized with swim frames (0-3 cycles)
  const phaseRef = useRef(0)

  // Main heading — changes slowly (every ~8 swim cycles)
  const headingRef = useRef(randomHeading())

  useEffect(() => {
    setLeft(prev => clamp(prev, horizontalBounds.min, horizontalBounds.max))
  }, [horizontalBounds.max, horizontalBounds.min])

  useEffect(() => {
    setTop(prev => clamp(prev, verticalBounds.min, verticalBounds.max))
  }, [verticalBounds.max, verticalBounds.min])

  // Tick: advance swim-phase and apply thrust
  useEffect(() => {
    if (reducedMotion) return

    let cycleCount = 0

    const interval = setInterval(() => {
      phaseRef.current = (phaseRef.current + 1) % 4

      // Every 8 full swim cycles, nudge heading slightly
      if (phaseRef.current === 0) {
        cycleCount++
        if (cycleCount % 8 === 0) {
          headingRef.current = nudgeHeading(headingRef.current)
        }
      }

      const thrust = thrustForPhase(phaseRef.current)
      const heading = headingRef.current

      setLeft(prev => {
        const next = prev + Math.round(heading.hdx * thrust)
        if (next <= horizontalBounds.min) {
          headingRef.current = { ...headingRef.current, hdx: Math.abs(headingRef.current.hdx) }
          return horizontalBounds.min
        }
        if (next >= horizontalBounds.max) {
          headingRef.current = { ...headingRef.current, hdx: -Math.abs(headingRef.current.hdx) }
          return horizontalBounds.max
        }
        return next
      })

      setTop(prev => {
        // Add gentle sine wobble to vertical drift
        const wobble = Math.sin(cycleCount * 0.4 + phaseRef.current * 0.3) * 0.5
        const next = prev + Math.round(heading.hdy * thrust + wobble)
        if (next <= verticalBounds.min) {
          headingRef.current = { ...headingRef.current, hdy: Math.abs(headingRef.current.hdy) }
          return verticalBounds.min
        }
        if (next >= verticalBounds.max) {
          headingRef.current = { ...headingRef.current, hdy: -Math.abs(headingRef.current.hdy) }
          return verticalBounds.max
        }
        return next
      })
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [
    horizontalBounds.max,
    horizontalBounds.min,
    reducedMotion,
    verticalBounds.max,
    verticalBounds.min,
  ])

  return (
    <Box
      position="absolute"
      left={left}
      top={top}
      width={JELLYFISH_WIDTH}
      flexDirection="column"
    >
      <AnimatedJellyfish status={status} width={JELLYFISH_WIDTH} />
    </Box>
  )
}

/**
 * Thrust multiplier per swim phase.
 * Phase 2 (contracted) = peak propulsion.
 */
function thrustForPhase(phase: number): number {
  switch (phase) {
    case 0: return 0.3  // expanded → coasting
    case 1: return 0.7  // contracting → accelerating
    case 2: return 2.5  // contracted → THRUST
    case 3: return 0.7  // expanding → decelerating
    default: return 1
  }
}

interface Heading {
  hdx: number // horizontal direction (-1 or +1) with magnitude
  hdy: number // vertical direction (-1, 0, +1)
}

function randomHeading(): Heading {
  return {
    hdx: Math.random() > 0.5 ? 1.2 : -1.2,
    hdy: (Math.random() - 0.5) * 0.8,
  }
}

function nudgeHeading(current: Heading): Heading {
  return {
    hdx: current.hdx + (Math.random() - 0.5) * 0.4,
    hdy: Math.max(-0.6, Math.min(0.6, current.hdy + (Math.random() - 0.5) * 0.3)),
  }
}

function resolveBounds(
  min: number | undefined,
  max: number | undefined,
  containerSize: number,
  itemSize: number,
) {
  const hardMin = 0
  const hardMax = Math.max(0, containerSize - itemSize)
  const resolvedMin = clamp(min ?? hardMin, hardMin, hardMax)
  const resolvedMax = clamp(max ?? hardMax, resolvedMin, hardMax)
  return { min: resolvedMin, max: resolvedMax }
}

function midpoint(min: number, max: number) {
  return Math.floor((min + max) / 2)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export { JELLYFISH_WIDTH, JELLYFISH_HEIGHT }
