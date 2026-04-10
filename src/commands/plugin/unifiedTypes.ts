import type { ConfigScope, MCPServerConnection } from '../../services/mcp/types.js'
import type { LoadedPlugin, PluginError } from '../../types/plugin.js'
import type { PersistablePluginScope } from '../../utils/plugins/pluginIdentifier.js'

export type UnifiedInstalledScope =
  | ConfigScope
  | PersistablePluginScope
  | 'builtin'
  | 'flagged'

export type UnifiedPluginPendingToggle = 'will-enable' | 'will-disable'

export type UnifiedPluginItem = {
  type: 'plugin'
  id: string
  name: string
  description?: string
  marketplace: string
  scope: PersistablePluginScope | 'builtin'
  isEnabled: boolean
  errorCount: number
  errors: PluginError[]
  plugin: LoadedPlugin
  pendingEnable?: boolean
  pendingUpdate?: boolean
  pendingToggle?: UnifiedPluginPendingToggle
}

export type UnifiedFailedPluginItem = {
  type: 'failed-plugin'
  id: string
  name: string
  marketplace: string
  scope: PersistablePluginScope
  errorCount: number
  errors: PluginError[]
}

export type UnifiedFlaggedPluginItem = {
  type: 'flagged-plugin'
  id: string
  name: string
  marketplace: string
  scope: 'flagged'
  reason: string
  text: string
  flaggedAt: string
}

export type UnifiedMcpItem = {
  type: 'mcp'
  id: string
  name: string
  description?: string
  scope: ConfigScope
  status: MCPServerConnection['type']
  client: MCPServerConnection
  indented?: boolean
}

export type UnifiedInstalledItem =
  | UnifiedPluginItem
  | UnifiedFailedPluginItem
  | UnifiedFlaggedPluginItem
  | UnifiedMcpItem
