import type { Command } from '../../commands.js'

const publicMode = {
  type: 'local',
  name: 'public-mode',
  description: 'Manage Public Mode writing guard settings',
  argumentHint:
    '[status|on|off|auto|default on|default off|default auto|default clear]',
  immediate: true,
  supportsNonInteractive: false,
  load: () => import('./public-mode.js'),
} satisfies Command

export default publicMode
