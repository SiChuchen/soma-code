import type { ToolUseContext } from '../../Tool.js'
import type { Message } from '../../types/message.js'
import { isSkillSearchEnabled } from './featureCheck.js'
import type { DiscoverySignal } from './signals.js'

export type SkillDiscoveryAttachment = {
  type: 'skill_discovery'
  skills: Array<{
    name: string
    description: string
    shortId?: string
  }>
  signal: DiscoverySignal
  source: 'native' | 'aki' | 'both'
}

export type SkillDiscoveryPrefetchHandle = {
  signal: DiscoverySignal
  promise: Promise<SkillDiscoveryAttachment[]>
}

const EMPTY_SKILLS: SkillDiscoveryAttachment[] = []

export async function getTurnZeroSkillDiscovery(
  _input: string,
  _messages: Message[],
  _context: ToolUseContext,
): Promise<SkillDiscoveryAttachment[]> {
  return EMPTY_SKILLS
}

export function startSkillDiscoveryPrefetch(
  _signal: AbortSignal | null,
  _messages: Message[],
  _toolUseContext: ToolUseContext,
): SkillDiscoveryPrefetchHandle | null {
  if (!isSkillSearchEnabled()) {
    return null
  }

  return {
    signal: 'inter_turn_write_pivot',
    promise: Promise.resolve(EMPTY_SKILLS),
  }
}

export async function collectSkillDiscoveryPrefetch(
  handle: SkillDiscoveryPrefetchHandle | null,
): Promise<SkillDiscoveryAttachment[]> {
  return handle ? handle.promise : EMPTY_SKILLS
}
