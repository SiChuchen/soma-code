import type { Command, LocalCommandModule } from '../../types/command.js'

const UNAVAILABLE_MESSAGE =
  'Agents platform commands are unavailable in this reconstructed snapshot.'

const agentsPlatformCommand: Command = {
  type: 'local',
  name: 'agents-platform',
  description: 'Manage agents platform integration',
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

export default agentsPlatformCommand
