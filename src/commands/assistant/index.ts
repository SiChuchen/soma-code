import type { Command } from '../../commands.js'

const assistantCommand = {
  type: 'local-jsx',
  name: 'assistant',
  description: 'Manage local assistant mode settings',
  argumentHint: '[status|on|off|name <value>]',
  immediate: true,
  load: () => import('./assistant.js'),
} satisfies Command

export default assistantCommand
