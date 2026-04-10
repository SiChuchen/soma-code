import { getOriginalCwd } from '../bootstrap/state.js'
import { getProjectConfigPath } from '../utils/configPaths.js'
import { getInitialSettings } from '../utils/settings/settings.js'
import { setCliTeammateModeOverride } from '../utils/swarm/backends/teammateModeSnapshot.js'

const ASSISTANT_SETTINGS_PATH = '.soma/settings.json#assistant'

let assistantForced = false

function getAssistantName(): string {
  const assistantNameSetting = getInitialSettings().assistantName
  const assistantName =
    typeof assistantNameSetting === 'string'
      ? assistantNameSetting.trim()
      : undefined
  return assistantName && assistantName.length > 0 ? assistantName : 'assistant'
}

function isAssistantEnabledInSettings(): boolean {
  return getInitialSettings().assistant === true
}

export function markAssistantForced(): void {
  assistantForced = true
}

export function isAssistantForced(): boolean {
  return assistantForced
}

export function isAssistantMode(): boolean {
  return assistantForced || isAssistantEnabledInSettings()
}

export async function initializeAssistantTeam() {
  setCliTeammateModeOverride('in-process')

  const assistantName = getAssistantName()

  return {
    teamName: 'assistant',
    teamFilePath: getProjectConfigPath(
      getOriginalCwd(),
      'assistant-team.json',
    ),
    leadAgentId: 'assistant-lead',
    selfAgentId: 'assistant-lead',
    selfAgentName: assistantName,
    isLeader: true,
    teammates: {},
  }
}

export function getAssistantSystemPromptAddendum(): string {
  return `# Assistant Mode
Assistant mode is active for this session.

- Maintain continuity across reconnects when the surrounding runtime supports it.
- Prefer concise operational check-ins over long conversational framing.
- Treat this session as a locally reconstructed compatibility path, not a full daemon-backed assistant runtime.`
}

export function getAssistantActivationPath(): string | undefined {
  if (assistantForced) {
    return '--assistant'
  }

  if (isAssistantEnabledInSettings()) {
    return ASSISTANT_SETTINGS_PATH
  }

  return undefined
}
