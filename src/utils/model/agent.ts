import type { PermissionMode } from '../permissions/PermissionMode.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import { capitalize } from '../stringUtils.js'
import { isModelAlias } from './aliases.js'
import { applyBedrockRegionPrefix, getBedrockRegionPrefix } from './bedrock.js'
import {
  getRuntimeMainLoopModel,
  parseUserSpecifiedModel,
} from './model.js'
import { getAPIProvider } from './providers.js'
import { resolveSelectedModelRoute } from '../inference/router.js'

export const AGENT_MODEL_OPTIONS = ['inherit'] as const
export type AgentModelAlias = (typeof AGENT_MODEL_OPTIONS)[number]

export type AgentModelOption = {
  value: string
  label: string
  description: string
}

/**
 * Get the default subagent model. Returns 'inherit' so subagents inherit
 * the model from the parent thread.
 */
export function getDefaultSubagentModel(): string {
  return 'inherit'
}

function isClaudeConfiguredForCurrentSettings(): boolean {
  const settings = getSettings_DEPRECATED() || {}
  const route = resolveSelectedModelRoute({ settings })
  return route.selectedEndpoint.protocol === 'anthropic'
}

function resolveAgentExplicitModel(
  modelSpec: string,
  parentModel: string,
): string {
  const trimmed = modelSpec.trim()
  if (trimmed === 'inherit') {
    return parentModel
  }

  const normalized = trimmed.toLowerCase()
  if (!isModelAlias(normalized) || isClaudeConfiguredForCurrentSettings()) {
    return parseUserSpecifiedModel(trimmed)
  }

  const parentHas1m = /\[1m\]$/i.test(parentModel)
  if (parentHas1m && !/\[1m\]$/i.test(trimmed) && (normalized === 'opus' || normalized === 'sonnet')) {
    const baseParent = parentModel.replace(/\[1m\]$/i, '').trim()
    if (normalized === 'opus' && baseParent.toLowerCase().includes('opus')) {
      return parentModel
    }
    if (normalized === 'sonnet' && baseParent.toLowerCase().includes('sonnet')) {
      return parentModel
    }
  }

  return trimmed
}

/**
 * Get the effective model string for an agent.
 *
 * Behavior:
 * - If the caller explicitly specifies a model, use that model.
 * - Otherwise, use the agent definition's model.
 * - If neither is specified (or the value is `inherit`), inherit the parent model.
 *
 * For Bedrock, if the parent model uses a cross-region inference prefix (e.g., "eu.", "us."),
 * that prefix is inherited by subagents using alias models (e.g., "sonnet", "haiku", "opus").
 */
export function getAgentModel(
  agentModel: string | undefined,
  parentModel: string,
  toolSpecifiedModel?: string,
  permissionMode?: PermissionMode,
): string {
  if (process.env.CLAUDE_CODE_SUBAGENT_MODEL) {
    return resolveAgentExplicitModel(
      process.env.CLAUDE_CODE_SUBAGENT_MODEL,
      parentModel,
    )
  }

  const parentRegionPrefix = getBedrockRegionPrefix(parentModel)

  const applyParentRegionPrefix = (
    resolvedModel: string,
    originalSpec: string,
  ): string => {
    if (parentRegionPrefix && getAPIProvider() === 'bedrock') {
      if (getBedrockRegionPrefix(originalSpec)) return resolvedModel
      return applyBedrockRegionPrefix(resolvedModel, parentRegionPrefix)
    }
    return resolvedModel
  }

  const explicitModel = toolSpecifiedModel ?? agentModel ?? getDefaultSubagentModel()

  if (explicitModel === 'inherit') {
    return getRuntimeMainLoopModel({
      permissionMode: permissionMode ?? 'default',
      mainLoopModel: parentModel,
      exceeds200kTokens: false,
    })
  }

  const model = resolveAgentExplicitModel(explicitModel, parentModel)
  return applyParentRegionPrefix(model, explicitModel)
}

export function getAgentModelDisplay(model: string | undefined): string {
  if (!model) return 'Inherit from parent (default)'
  if (model === 'inherit') return 'Inherit from parent'
  return capitalize(model)
}

/**
 * Get available model options for agents
 */
export function getAgentModelOptions(): AgentModelOption[] {
  const options: AgentModelOption[] = [
    {
      value: 'inherit',
      label: 'Inherit from parent',
      description: 'Use the same model as the main conversation',
    },
  ]

  const settings = getSettings_DEPRECATED() || {}
  const models = settings.inference?.models ?? []
  for (const model of models) {
    if (model.enabled === false) continue
    const value = model.remoteModel?.trim() || model.id?.trim()
    if (!value || options.some(option => option.value === value)) continue
    options.push({
      value,
      label: model.label?.trim() || value,
      description: model.id?.trim() && model.id.trim() !== value ? model.id.trim() : value,
    })
  }

  return options
}
