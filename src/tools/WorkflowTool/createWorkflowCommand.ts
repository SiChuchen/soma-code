import type { Command, LocalCommandModule } from '../../types/command.js'

const UNAVAILABLE_MESSAGE =
  'Workflow scripts are unavailable in this reconstructed snapshot.'

export function createWorkflowCommand(
  name: string,
  description = 'Run a workflow script',
): Command {
  return {
    type: 'local',
    name,
    description,
    kind: 'workflow',
    isEnabled: () => false,
    isHidden: true,
    supportsNonInteractive: true,
    load: async (): Promise<LocalCommandModule> => ({
      call: async () => ({
        type: 'text',
        value: UNAVAILABLE_MESSAGE,
      }),
    }),
  }
}

export async function getWorkflowCommands(_cwd: string): Promise<Command[]> {
  return []
}
