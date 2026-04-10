import type { Command } from '../../commands.js'

const mobile = {
  type: 'local-jsx',
  name: 'mobile',
  aliases: ['repo', 'install'],
  description: 'Show a QR code for the somacode repository and install guide',
  load: () => import('./mobile.js'),
} satisfies Command

export default mobile
