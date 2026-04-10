let cacheVersion = 0

export function clearSkillIndexCache(): void {
  cacheVersion += 1
}

export function getSkillIndexCacheVersion(): number {
  return cacheVersion
}
