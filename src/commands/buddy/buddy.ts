import { getCompanion, roll } from '../../buddy/companion.js'
import {
  RARITY_STARS,
  STAT_NAMES,
  type Companion,
  type StatName,
  type StoredCompanion,
} from '../../buddy/types.js'
import type { LocalCommandCall } from '../../types/command.js'
import {
  getGlobalConfig,
  getOrCreateUserID,
  saveGlobalConfig,
} from '../../utils/config.js'

type BuddyCommandContext = Parameters<LocalCommandCall>[1]

const BUDDY_HELP = [
  'Usage: /buddy [hatch|pet|status|mute|unmute|help]',
  'No buddy yet: `/buddy` hatches one.',
  'With a buddy: `/buddy` pets it.',
].join('\n')

const BUDDY_NAMES = [
  'Pico',
  'Miso',
  'Orbit',
  'Nori',
  'Comet',
  'Pebble',
  'Juno',
  'Pixel',
  'Scout',
  'Glint',
  'Mochi',
  'Sprig',
  'Kite',
  'Nova',
  'Pip',
  'Biscuit',
  'Sable',
  'Tango',
] as const

const PERSONALITY_OPENERS = [
  'Quietly attentive,',
  'A little smug but loyal,',
  'Warm around familiar work,',
  'Always half a step ahead,',
] as const

const PERSONALITY_BY_STAT = {
  DEBUGGING: [
    'it loves sniffing out the exact line where things went sideways.',
    'it treats broken flows like puzzles worth staring down.',
    'it perks up whenever a stubborn bug finally blinks first.',
  ],
  PATIENCE: [
    'it can wait out a messy refactor without losing its nerve.',
    'it settles beside long-running tasks like they are weather.',
    'it has no problem watching a careful plan unfold at human speed.',
  ],
  CHAOS: [
    'it secretly enjoys a sharp turn in the middle of a clean plan.',
    'it is happiest when a wild idea somehow works on the first try.',
    'it keeps a little room for mischief beside the cursor.',
  ],
  WISDOM: [
    'it watches the session like it has seen this shape of problem before.',
    'it leans toward the calm answer even when the room gets noisy.',
    'it prefers the fix that still makes sense tomorrow morning.',
  ],
  SNARK: [
    'it has a dry sense for suspicious code and overconfident comments.',
    'it likes being right just a little too much.',
    'it can be pointed, but never mean about it.',
  ],
} as const satisfies Record<StatName, readonly string[]>

const PET_REACTIONS = {
  DEBUGGING: [
    'purrs like a passing test.',
    'sniffs out a bug and chirps.',
    'nudges the broken line toward you.',
  ],
  PATIENCE: [
    'settles in beside the prompt.',
    'leans into the pet and stays calm.',
    'blinks slowly, like there is time.',
  ],
  CHAOS: [
    'does a tiny victory spin.',
    'bounces once and pretends it meant to.',
    'looks delighted by the slightest mayhem.',
  ],
  WISDOM: [
    'blinks like it already knew.',
    'gives you a measured, approving stare.',
    'goes still in a very thoughtful way.',
  ],
  SNARK: [
    'looks smug, but affectionate.',
    'accepts the pet like you finally did the obvious thing.',
    'acts unimpressed for about half a second.',
  ],
} as const satisfies Record<StatName, readonly string[]>

const HATCH_REACTIONS = [
  'peeks over the prompt.',
  'blinks awake beside the cursor.',
  'settles in at the edge of the input box.',
] as const

const UNMUTE_REACTIONS = [
  'perks up again.',
  'slides back beside the prompt.',
  'returns to quiet supervision.',
] as const

function hashString(value: string): number {
  if (typeof Bun !== 'undefined') {
    return Number(BigInt(Bun.hash(value)) & 0xffffffffn)
  }

  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function pickBySeed<T>(seed: string, values: readonly T[]): T {
  return values[hashString(seed) % values.length]!
}

function getStrongestStatFromStats(stats: Record<StatName, number>): StatName {
  return STAT_NAMES.reduce(
    (best, current) => (stats[current] > stats[best] ? current : best),
    STAT_NAMES[0],
  )
}

function getStrongestStat(companion: Pick<Companion, 'stats'>): StatName {
  return getStrongestStatFromStats(companion.stats)
}

function getBuddyUserId(): string {
  const config = getGlobalConfig()
  return config.oauthAccount?.accountUuid ?? config.userID ?? getOrCreateUserID()
}

function hydrateStoredCompanion(
  stored: StoredCompanion,
  userId: string,
): Companion {
  return {
    ...stored,
    ...roll(userId).bones,
  }
}

function createStoredCompanion(userId: string): StoredCompanion {
  const { bones } = roll(userId)
  const strongestStat = getStrongestStatFromStats(bones.stats)
  const personality = [
    pickBySeed(`${userId}:opener`, PERSONALITY_OPENERS),
    pickBySeed(
      `${userId}:personality:${strongestStat}`,
      PERSONALITY_BY_STAT[strongestStat],
    ),
    pickBySeed(`${userId}:species:${bones.species}`, [
      `It has unmistakable ${bones.species} energy.`,
      `It watches the terminal like a very opinionated ${bones.species}.`,
      `It treats the cursor like its favorite ${bones.species} perch.`,
    ]),
  ].join(' ')

  return {
    name: pickBySeed(`${userId}:name`, BUDDY_NAMES),
    personality,
    hatchedAt: Date.now(),
  }
}

function formatBuddyStatus(companion: Companion): string {
  const strongestStat = getStrongestStat(companion)
  const status = getGlobalConfig().companionMuted ? 'muted' : 'active'

  return [
    `${companion.name} the ${companion.species}`,
    `Rarity: ${RARITY_STARS[companion.rarity]} ${companion.rarity}`,
    `Top stat: ${strongestStat} ${companion.stats[strongestStat]}`,
    `Status: ${status}`,
    `Personality: ${companion.personality}`,
    'Commands: /buddy pet, /buddy mute, /buddy unmute, /buddy status',
  ].join('\n')
}

function setBuddyReaction(
  context: BuddyCommandContext,
  reaction: string | undefined,
  pet = false,
): void {
  const petAt = pet ? Date.now() : undefined

  context.setAppState(prev => {
    if (
      prev.companionReaction === reaction &&
      (!pet || prev.companionPetAt === petAt)
    ) {
      return prev
    }

    return {
      ...prev,
      companionReaction: reaction,
      ...(pet ? { companionPetAt: petAt } : {}),
    }
  })
}

function missingBuddyResult() {
  return {
    type: 'text' as const,
    value: 'No buddy hatched yet.\nRun `/buddy` to hatch one.',
  }
}

function hatchBuddy(context: BuddyCommandContext) {
  const existing = getCompanion()
  if (existing) {
    return {
      type: 'text' as const,
      value: `${existing.name} is already hatched.\n${formatBuddyStatus(existing)}`,
    }
  }

  const userId = getBuddyUserId()
  const stored = createStoredCompanion(userId)

  saveGlobalConfig(current =>
    current.companion
      ? current
      : {
          ...current,
          companion: stored,
          companionMuted: false,
        },
  )

  const companion = getCompanion() ?? hydrateStoredCompanion(stored, userId)
  setBuddyReaction(
    context,
    `${companion.name} ${pickBySeed(`${userId}:hatch`, HATCH_REACTIONS)}`,
  )

  return {
    type: 'text' as const,
    value: `Hatched ${companion.name}.\n${formatBuddyStatus(companion)}`,
  }
}

function petBuddy(companion: Companion, context: BuddyCommandContext) {
  if (getGlobalConfig().companionMuted) {
    return {
      type: 'text' as const,
      value: `${companion.name} is muted.\nRun \`/buddy unmute\` first.`,
    }
  }

  const strongestStat = getStrongestStat(companion)
  const timeBucket = Math.floor(Date.now() / 1000)
  const reaction = pickBySeed(
    `${companion.name}:${timeBucket}:${strongestStat}`,
    PET_REACTIONS[strongestStat],
  )

  setBuddyReaction(context, reaction, true)

  return {
    type: 'text' as const,
    value: `You pet ${companion.name}.\n${reaction}`,
  }
}

function muteBuddy(companion: Companion, context: BuddyCommandContext) {
  if (getGlobalConfig().companionMuted) {
    return {
      type: 'text' as const,
      value: `${companion.name} is already muted.`,
    }
  }

  saveGlobalConfig(current => ({
    ...current,
    companionMuted: true,
  }))
  setBuddyReaction(context, undefined)

  return {
    type: 'text' as const,
    value: `${companion.name} will stay quiet until you run \`/buddy unmute\`.`,
  }
}

function unmuteBuddy(companion: Companion, context: BuddyCommandContext) {
  if (!getGlobalConfig().companionMuted) {
    return {
      type: 'text' as const,
      value: `${companion.name} is already active.`,
    }
  }

  saveGlobalConfig(current => ({
    ...current,
    companionMuted: false,
  }))

  setBuddyReaction(
    context,
    `${companion.name} ${pickBySeed(
      `${companion.name}:unmute`,
      UNMUTE_REACTIONS,
    )}`,
  )

  return {
    type: 'text' as const,
    value: `${companion.name} is active again.`,
  }
}

export const call: LocalCommandCall = async (args, context) => {
  const action = args.trim().toLowerCase()
  const companion = getCompanion()

  if (!action) {
    if (!companion) return hatchBuddy(context)
    if (getGlobalConfig().companionMuted) return unmuteBuddy(companion, context)
    return petBuddy(companion, context)
  }

  switch (action) {
    case 'hatch':
      return hatchBuddy(context)
    case 'pet':
      return companion ? petBuddy(companion, context) : missingBuddyResult()
    case 'status':
      return companion
        ? {
            type: 'text',
            value: formatBuddyStatus(companion),
          }
        : missingBuddyResult()
    case 'mute':
    case 'off':
      return companion ? muteBuddy(companion, context) : missingBuddyResult()
    case 'unmute':
    case 'on':
      return companion ? unmuteBuddy(companion, context) : missingBuddyResult()
    case 'help':
      return {
        type: 'text',
        value: BUDDY_HELP,
      }
    default:
      return {
        type: 'text',
        value: `Unknown /buddy action: ${action}\n${BUDDY_HELP}`,
      }
  }
}
