import type { AgentDefinition } from '../tools/AgentTool/loadAgentsDir.js'
import { EXPLORE_AGENT } from '../tools/AgentTool/built-in/exploreAgent.js'
import { GENERAL_PURPOSE_AGENT } from '../tools/AgentTool/built-in/generalPurposeAgent.js'
import { PLAN_AGENT } from '../tools/AgentTool/built-in/planAgent.js'

export const COORDINATOR_AGENT_TYPES = [
  GENERAL_PURPOSE_AGENT.agentType,
  EXPLORE_AGENT.agentType,
  PLAN_AGENT.agentType,
] as const

const COORDINATOR_EXPLORE_AGENT: AgentDefinition = {
  ...EXPLORE_AGENT,
  // Coordinator workers should inherit the main thread's configured model
  // unless the caller explicitly overrides it on the Agent tool call.
  model: 'inherit',
}

// Coordinator mode expects a smaller worker-facing built-in agent set than the
// normal interactive session. Keep this conservative and local-source-driven:
// one general worker plus the read-only explore/plan specialists.
export function getCoordinatorAgents(): AgentDefinition[] {
  return [GENERAL_PURPOSE_AGENT, COORDINATOR_EXPLORE_AGENT, PLAN_AGENT]
}
