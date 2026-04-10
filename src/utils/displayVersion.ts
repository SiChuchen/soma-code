export function getDisplayVersion(
  version: string | null | undefined = MACRO.VERSION,
): string {
  if (!version) {
    return 'unknown'
  }

  const stableVersionMatch = version.match(/^(\d+)\.(\d+)\.0$/)

  if (stableVersionMatch) {
    return `${stableVersionMatch[1]}.${stableVersionMatch[2]}`
  }

  return version
}
