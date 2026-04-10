import { registerBundledSkill } from '../bundledSkills.js'

const UNAVAILABLE_MESSAGE =
  'The bundled run-skill-generator skill was not present in this extracted snapshot.'

export function registerRunSkillGeneratorSkill(): void {
  registerBundledSkill({
    name: 'run-skill-generator',
    description: UNAVAILABLE_MESSAGE,
    userInvocable: false,
    isEnabled: () => false,
    async getPromptForCommand() {
      return [{ type: 'text', text: UNAVAILABLE_MESSAGE }]
    },
  })
}
