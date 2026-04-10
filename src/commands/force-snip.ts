import type { Command, LocalCommandModule } from '../types/command.js'

const UNAVAILABLE_MESSAGE =
  'Forced history snip is unavailable in this reconstructed snapshot.'

const forceSnipCommand: Command = {
  type: 'local',
  name: 'force-snip',
  description: 'Force a history snip of the current session',
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

export default forceSnipCommand
