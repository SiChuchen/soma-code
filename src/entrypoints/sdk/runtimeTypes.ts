import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import type { z } from 'zod/v4'
import type { McpSdkServerConfig } from '../../services/mcp/types.js'
import type { SDKMessage, SDKSessionInfo } from './coreTypes.js'

export type AnyZodRawShape = z.ZodRawShape
export type InferShape<Shape extends AnyZodRawShape> = z.output<
  z.ZodObject<Shape>
>

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

export type SdkMcpToolDefinition<
  Schema extends AnyZodRawShape = AnyZodRawShape,
> = {
  name: string
  description: string
  inputSchema: Schema
  handler: (
    args: InferShape<Schema>,
    extra: unknown,
  ) => Promise<CallToolResult>
  extras?: {
    annotations?: ToolAnnotations
    searchHint?: string
    alwaysLoad?: boolean
  }
}

export type McpSdkServerConfigWithInstance = McpSdkServerConfig & {
  instance?: unknown
}

export type Options = {
  model?: string
  cwd?: string
  permissionMode?: string
  maxThinkingTokens?: number | null
  [key: string]: unknown
}

export type InternalOptions = Options & {
  outputFormat?: unknown
}

export type Query = AsyncIterable<SDKMessage>
export type InternalQuery = Query
export type SessionMessage = SDKMessage

export type ListSessionsOptions = {
  dir?: string
  limit?: number
  offset?: number
}

export type GetSessionInfoOptions = {
  dir?: string
}

export type GetSessionMessagesOptions = {
  dir?: string
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
}

export type SessionMutationOptions = {
  [key: string]: unknown
}

export type ForkSessionOptions = {
  [key: string]: unknown
}

export type ForkSessionResult = {
  sessionId?: string
  [key: string]: unknown
}

export type SDKSessionOptions = Options & {
  sessionId?: string
}

export interface SDKSession {
  readonly id?: string
  getInfo?(): Promise<SDKSessionInfo | undefined>
  getMessages?(options?: GetSessionMessagesOptions): Promise<SessionMessage[]>
  interrupt?(): Promise<void>
  abort?(): void
  fork?(options?: ForkSessionOptions): Promise<ForkSessionResult>
}
