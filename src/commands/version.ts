import type { Command, LocalCommandCall } from '../types/command.js'
import { getDisplayVersion } from '../utils/displayVersion.js'

const call: LocalCommandCall = async () => {
  const displayVersion = getDisplayVersion()

  return {
    type: 'text',
    value: MACRO.BUILD_TIME
      ? `${displayVersion} (built ${MACRO.BUILD_TIME})`
      : displayVersion,
  }
}

const version = {
  type: 'local',
  name: 'version',
  description:
    'Print the version this session is running (not what autoupdate downloaded)',
  isEnabled: () => process.env.USER_TYPE === 'ant',
  supportsNonInteractive: true,
  load: () => Promise.resolve({ call }),
} satisfies Command

export default version
