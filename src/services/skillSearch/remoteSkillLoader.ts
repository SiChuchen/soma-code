export type RemoteSkillFetchMethod = 'cache' | 'network' | 'compat_disabled'

export type RemoteSkillLoadResult = {
  cacheHit: boolean
  latencyMs: number
  skillPath: string
  content: string
  fileCount: number
  totalBytes: number
  fetchMethod: RemoteSkillFetchMethod
}

export async function loadRemoteSkill(
  slug: string,
  _url: string,
): Promise<RemoteSkillLoadResult> {
  throw new Error(
    `Remote skill loading is unavailable in this recovery snapshot: ${slug}`,
  )
}
