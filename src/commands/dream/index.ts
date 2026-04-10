import type { Command } from '../../commands.js'

const dream: Command = {
  type: 'local',
  name: 'dream',
  description: 'Run local memory consolidation now',
  immediate: true,
  supportsNonInteractive: false,
  load: () => import('./dream.js'),
}

export default dream
