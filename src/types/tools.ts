import type {
  AssistantMessage,
  NormalizedUserMessage,
} from './message.js'

type ProgressConversationMessage = AssistantMessage | NormalizedUserMessage

type MessageProgress = {
  message: ProgressConversationMessage
  prompt: string
  agentId: string
}

type ShellProgressBase = {
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes?: number
  timeoutMs?: number
  taskId?: string
}

export type BashProgress = ShellProgressBase & {
  type: 'bash_progress'
}

export type PowerShellProgress = ShellProgressBase & {
  type: 'powershell_progress'
}

export type ShellProgress = BashProgress | PowerShellProgress

export type AgentToolProgress = MessageProgress & {
  type: 'agent_progress'
}

export type SkillToolProgress = MessageProgress & {
  type: 'skill_progress'
}

export type MCPProgress =
  | {
      type: 'mcp_progress'
      status: 'started' | 'completed' | 'failed'
      serverName: string
      toolName: string
      elapsedTimeMs?: number
      progress?: number
      total?: number
      progressMessage?: string
    }
  | {
      type: 'mcp_progress'
      status: 'progress'
      serverName: string
      toolName: string
      progress?: number
      total?: number
      progressMessage?: string
      elapsedTimeMs?: number
    }

export type WebSearchProgress =
  | {
      type: 'query_update'
      query: string
    }
  | {
      type: 'search_results_received'
      query: string
      resultCount: number
    }

export type TaskOutputProgress = {
  type: 'waiting_for_task'
  taskDescription: string
  taskType: string
}

export type REPLToolProgress = {
  type: 'repl_progress'
  message?: string
}

export type SdkWorkflowProgress = {
  status?: 'pending' | 'running' | 'completed' | 'failed' | (string & {})
  label?: string
  description?: string
  [key: string]: unknown
}

export type ToolProgressData =
  | AgentToolProgress
  | BashProgress
  | MCPProgress
  | PowerShellProgress
  | REPLToolProgress
  | SkillToolProgress
  | TaskOutputProgress
  | WebSearchProgress
