import type { Command } from '../../commands.js'

const coordinator = {
  type: 'local',
  name: 'coordinator',
  description: 'Manage coordinator mode settings',
  argumentHint: '[status|on|off|default on|default off|default clear]',
  immediate: true,
  supportsNonInteractive: false,
  load: () => import('./coordinator.js'),
} satisfies Command

export default coordinator
