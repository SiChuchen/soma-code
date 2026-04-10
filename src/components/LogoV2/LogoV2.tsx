// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { feature } from 'bun:bundle'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Box, Text } from '../../ink.js'
import { getDisplayPath } from '../../utils/file.js'
import { SomaLanding } from './SomaLanding.js'
import { getGlobalConfig, saveGlobalConfig } from 'src/utils/config.js'
import { getInitialSettings } from 'src/utils/settings/settings.js'
import { isDebugMode, isDebugToStdErr, getDebugLogPath } from 'src/utils/debug.js'
import {
  incrementProjectOnboardingSeenCount,
  shouldShowProjectOnboarding,
} from '../../projectOnboardingState.js'
import { OffscreenFreeze } from '../OffscreenFreeze.js'
import { getDumpPromptsPath } from 'src/services/api/dumpPrompts.js'
import {
  getStartupPerfLogPath,
  isDetailedProfilingEnabled,
} from 'src/utils/startupProfiler.js'
import { EmergencyTip } from './EmergencyTip.js'
import { VoiceModeNotice } from './VoiceModeNotice.js'
import { Opus1mMergeNotice } from './Opus1mMergeNotice.js'
import { SandboxManager } from 'src/utils/sandbox/sandbox-adapter.js'

/* eslint-disable @typescript-eslint/no-require-imports */
const ChannelsNoticeModule =
  feature('KAIROS') || feature('KAIROS_CHANNELS')
    ? (require('./ChannelsNotice.js') as typeof import('./ChannelsNotice.js'))
    : null
/* eslint-enable @typescript-eslint/no-require-imports */

export function LogoV2(): React.ReactNode {
  const config = getGlobalConfig()
  const showOnboarding = shouldShowProjectOnboarding()
  const showSandboxStatus = SandboxManager.isSandboxingEnabled()

  const [announcement] = useState(() => {
    const announcements = getInitialSettings().companyAnnouncements
    if (!announcements || announcements.length === 0) {
      return undefined
    }

    return config.numStartups === 1
      ? announcements[0]
      : announcements[Math.floor(Math.random() * announcements.length)]
  })

  useEffect(() => {
    const currentConfig = getGlobalConfig()
    if (currentConfig.lastReleaseNotesSeen === MACRO.VERSION) {
      return
    }

    saveGlobalConfig(current => {
      if (current.lastReleaseNotesSeen === MACRO.VERSION) {
        return current
      }

      return {
        ...current,
        lastReleaseNotesSeen: MACRO.VERSION,
      }
    })

    if (showOnboarding) {
      incrementProjectOnboardingSeenCount()
    }
  }, [showOnboarding])

  return (
    <>
      <OffscreenFreeze>
        <SomaLanding />
      </OffscreenFreeze>

      <VoiceModeNotice />
      <Opus1mMergeNotice />
      {ChannelsNoticeModule && <ChannelsNoticeModule.ChannelsNotice />}

      {isDebugMode() && (
        <Box paddingLeft={2} flexDirection="column">
          <Text color="warning">Debug mode enabled</Text>
          <Text dimColor>
            Logging to: {isDebugToStdErr() ? 'stderr' : getDebugLogPath()}
          </Text>
        </Box>
      )}

      <EmergencyTip />

      {process.env.CLAUDE_CODE_TMUX_SESSION && (
        <Box paddingLeft={2} flexDirection="column">
          <Text dimColor>
            tmux session: {process.env.CLAUDE_CODE_TMUX_SESSION}
          </Text>
          <Text dimColor>
            {process.env.CLAUDE_CODE_TMUX_PREFIX_CONFLICTS
              ? `Detach: ${process.env.CLAUDE_CODE_TMUX_PREFIX} ${process.env.CLAUDE_CODE_TMUX_PREFIX} d (press prefix twice - somacode uses ${process.env.CLAUDE_CODE_TMUX_PREFIX})`
              : `Detach: ${process.env.CLAUDE_CODE_TMUX_PREFIX} d`}
          </Text>
        </Box>
      )}

      {announcement && (
        <Box paddingLeft={2} flexDirection="column">
          {!process.env.IS_DEMO && config.oauthAccount?.organizationName && (
            <Text dimColor>
              Announcement from {config.oauthAccount.organizationName}:
            </Text>
          )}
          <Text>{announcement}</Text>
        </Box>
      )}

      {showSandboxStatus && (
        <Box paddingLeft={2} flexDirection="column">
          <Text color="warning">
            Your bash commands will be sandboxed. Disable with `/sandbox`.
          </Text>
        </Box>
      )}

      {false && !process.env.DEMO_VERSION && (
        <Box paddingLeft={2} flexDirection="column">
          <Text dimColor>Use /issue to report model behavior issues</Text>
        </Box>
      )}

      {false && !process.env.DEMO_VERSION && (
        <Box paddingLeft={2} flexDirection="column">
          <Text color="warning">[ANT-ONLY] Logs:</Text>
          <Text dimColor>API calls: {getDisplayPath(getDumpPromptsPath())}</Text>
          <Text dimColor>Debug logs: {getDisplayPath(getDebugLogPath())}</Text>
          {isDetailedProfilingEnabled() && (
            <Text dimColor>
              Startup Perf: {getDisplayPath(getStartupPerfLogPath())}
            </Text>
          )}
        </Box>
      )}
    </>
  )
}
