import type { Command, LocalCommandModule } from '../types/command.js'

const UNAVAILABLE_MESSAGE =
  'Proactive mode controls are unavailable in this reconstructed snapshot.'

const proactiveCommand: Command = {
  type: 'local',
  name: 'proactive',
  description: 'Manage proactive mode',
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

export default proactiveCommand
