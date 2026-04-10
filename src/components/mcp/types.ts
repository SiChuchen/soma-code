import type {
  ConfigScope,
  MCPServerConnection,
  McpClaudeAIProxyServerConfig,
  McpHTTPServerConfig,
  McpSSEServerConfig,
  McpStdioServerConfig,
} from '../../services/mcp/types.js'

type BaseServerInfo = {
  name: string
  client: MCPServerConnection
  scope: ConfigScope
}

export type StdioServerInfo = BaseServerInfo & {
  transport: 'stdio'
  config: McpStdioServerConfig
}

export type SSEServerInfo = BaseServerInfo & {
  transport: 'sse'
  config: McpSSEServerConfig
  isAuthenticated: boolean | undefined
}

export type HTTPServerInfo = BaseServerInfo & {
  transport: 'http'
  config: McpHTTPServerConfig
  isAuthenticated: boolean | undefined
}

export type ClaudeAIServerInfo = BaseServerInfo & {
  transport: 'claudeai-proxy'
  config: McpClaudeAIProxyServerConfig
  isAuthenticated: boolean | undefined
}

export type ServerInfo =
  | StdioServerInfo
  | SSEServerInfo
  | HTTPServerInfo
  | ClaudeAIServerInfo

export type AgentMcpServerInfo =
  | {
      name: string
      sourceAgents: string[]
      transport: 'stdio'
      command: string
      needsAuth: false
      isAuthenticated?: boolean
    }
  | {
      name: string
      sourceAgents: string[]
      transport: 'sse' | 'http'
      url: string
      needsAuth: true
      isAuthenticated?: boolean
    }
  | {
      name: string
      sourceAgents: string[]
      transport: 'ws'
      url: string
      needsAuth: false
      isAuthenticated?: boolean
    }

export type MCPViewState =
  | {
      type: 'list'
      defaultTab?: string
    }
  | {
      type: 'server-menu'
      server: ServerInfo
    }
  | {
      type: 'server-tools'
      server: ServerInfo
    }
  | {
      type: 'server-tool-detail'
      server: ServerInfo
      toolIndex: number
    }
  | {
      type: 'agent-server-menu'
      agentServer: AgentMcpServerInfo
    }
