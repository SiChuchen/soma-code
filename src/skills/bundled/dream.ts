import { registerBundledSkill } from '../bundledSkills.js'

const UNAVAILABLE_MESSAGE =
  'The bundled dream skill was not present in this extracted snapshot.'

export function registerDreamSkill(): void {
  registerBundledSkill({
    name: 'dream',
    description: UNAVAILABLE_MESSAGE,
    userInvocable: false,
    isEnabled: () => false,
    async getPromptForCommand() {
      return [{ type: 'text', text: UNAVAILABLE_MESSAGE }]
    },
  })
}
