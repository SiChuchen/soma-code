import type { Command } from '../../commands.js'

const buddyCommand = {
  type: 'local',
  name: 'buddy',
  description: 'Hatch and manage your somacode buddy',
  argumentHint: '[hatch|pet|status|mute|unmute]',
  supportsNonInteractive: true,
  load: () => import('./buddy.js'),
} satisfies Command

export default buddyCommand
