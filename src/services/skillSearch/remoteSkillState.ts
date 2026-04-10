export const REMOTE_SKILL_CANONICAL_PREFIX = '_canonical_'

export type DiscoveredRemoteSkillMeta = {
  slug: string
  url: string
  name?: string
  description?: string
  source?: 'native' | 'aki' | 'both'
}

const discoveredRemoteSkills = new Map<string, DiscoveredRemoteSkillMeta>()

export function stripCanonicalPrefix(name: string): string | null {
  return name.startsWith(REMOTE_SKILL_CANONICAL_PREFIX)
    ? name.slice(REMOTE_SKILL_CANONICAL_PREFIX.length)
    : null
}

export function getDiscoveredRemoteSkill(
  slug: string,
): DiscoveredRemoteSkillMeta | null {
  return discoveredRemoteSkills.get(slug) ?? null
}

export function setDiscoveredRemoteSkills(
  skills: Iterable<DiscoveredRemoteSkillMeta>,
): void {
  discoveredRemoteSkills.clear()
  for (const skill of skills) {
    discoveredRemoteSkills.set(skill.slug, skill)
  }
}

export function clearDiscoveredRemoteSkills(): void {
  discoveredRemoteSkills.clear()
}
