import type { Command, LocalCommandModule } from '../../types/command.js'

const UNAVAILABLE_MESSAGE =
  'Workflow scripts are unavailable in this reconstructed snapshot.'

const workflowsCommand: Command = {
  type: 'local',
  name: 'workflows',
  description: 'Manage workflow scripts',
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

export default workflowsCommand
