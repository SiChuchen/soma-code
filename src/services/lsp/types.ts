import type { z } from 'zod/v4'
import { LspServerConfigSchema } from '../../utils/plugins/schemas.js'

type InferSchema<T extends (...args: never[]) => z.ZodTypeAny> = z.infer<
  ReturnType<T>
>

export type LspServerConfig = InferSchema<typeof LspServerConfigSchema>

export type ScopedLspServerConfig = LspServerConfig & {
  scope: 'dynamic' | 'user' | 'project' | 'local' | (string & {})
  source: string
}

export type LspServerState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error'
