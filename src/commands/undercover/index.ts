import type { Command } from '../../commands.js'

const undercover = {
  type: 'local',
  name: 'undercover',
  description: 'Compatibility alias for /public-mode',
  argumentHint:
    '[status|on|off|auto|default on|default off|default auto|default clear]',
  supportsNonInteractive: false,
  load: () => import('../public-mode/public-mode.js'),
} satisfies Command

export default undercover