import type { Command, LocalCommandModule } from '../types/command.js'

const UNAVAILABLE_MESSAGE =
  'Torch mode is unavailable in this reconstructed snapshot.'

const torchCommand: Command = {
  type: 'local',
  name: 'torch',
  description: 'Open the torch compatibility flow',
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

export default torchCommand
