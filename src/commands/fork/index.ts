import type { Command, LocalCommandModule } from '../../types/command.js'

const UNAVAILABLE_MESSAGE =
  'Fork subagents are unavailable in this reconstructed snapshot.'

const forkCommand: Command = {
  type: 'local',
  name: 'fork',
  argumentHint: '<directive>',
  description: 'Fork the current conversation into a background worker',
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

export default forkCommand
