import { registerBundledSkill } from '../bundledSkills.js'

const UNAVAILABLE_MESSAGE =
  'The bundled hunter skill was not present in this extracted snapshot.'

export function registerHunterSkill(): void {
  registerBundledSkill({
    name: 'hunter',
    description: UNAVAILABLE_MESSAGE,
    userInvocable: false,
    isEnabled: () => false,
    async getPromptForCommand() {
      return [{ type: 'text', text: UNAVAILABLE_MESSAGE }]
    },
  })
}
