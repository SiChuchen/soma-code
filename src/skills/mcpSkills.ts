import memoize from 'lodash-es/memoize.js'
import type { Command } from '../types/command.js'
import type { ConnectedMCPServer } from '../services/mcp/types.js'

async function loadMcpSkills(
  _client: ConnectedMCPServer,
): Promise<Command[]> {
  // Phase 1 compatibility layer: keep MCP resource refresh and command
  // composition working even though MCP skill reconstruction is incomplete.
  return []
}

export const fetchMcpSkillsForClient = memoize(
  async (client: ConnectedMCPServer): Promise<Command[]> =>
    loadMcpSkills(client),
  client => client.name,
)
