import type { Command, LocalCommandModule } from '../../types/command.js'

const UNAVAILABLE_MESSAGE =
  'Remote control server mode is unavailable in this reconstructed snapshot.'

const remoteControlServerCommand: Command = {
  type: 'local',
  name: 'remote-control-server',
  description: 'Start the remote control server',
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

export default remoteControlServerCommand
