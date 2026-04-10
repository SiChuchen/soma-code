import type { FileStateCache } from '../../utils/fileStateCache.js'
import type { ThemeName } from '../../utils/theme.js'

type MaybePromise<T> = T | Promise<T>

export type TipContext = {
  theme: ThemeName
  bashTools?: ReadonlySet<string>
  readFileState?: FileStateCache
}

export type Tip = {
  id: string
  content: (context: TipContext) => MaybePromise<string>
  cooldownSessions: number
  isRelevant: (context?: TipContext) => MaybePromise<boolean>
}
