import type { Command, LocalCommandModule } from '../types/command.js'

const UNAVAILABLE_MESSAGE =
  'PR subscription flows are unavailable in this reconstructed snapshot.'

const subscribePrCommand: Command = {
  type: 'local',
  name: 'subscribe-pr',
  description: 'Subscribe this session to a PR update feed',
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

export default subscribePrCommand
