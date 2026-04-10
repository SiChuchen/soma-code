import type { Command, LocalCommandModule } from '../../types/command.js'

const UNAVAILABLE_MESSAGE =
  'Cross-session peer discovery is unavailable in this reconstructed snapshot.'

const peersCommand: Command = {
  type: 'local',
  name: 'peers',
  description: 'List live cross-session peers',
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

export default peersCommand
