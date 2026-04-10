import * as React from 'react'
import { useEffect } from 'react'
import { Box, Text } from '../../ink.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { getDisplayVersion } from '../../utils/displayVersion.js'
import { getGlobalConfig } from '../../utils/config.js'
import { getAnthropicApiKeyWithSource, getAuthTokenSource } from '../../utils/auth.js'
import {
  formatWelcomeMessage,
  getLogoDisplayData,
  getRecentActivitySync,
  getRecentReleaseNotesSync,
} from '../../utils/logoV2Utils.js'
import { getEffortSuffix } from '../../utils/effort.js'
import { resolvePublicModeState } from '../../utils/publicMode.js'
import { isCoordinatorMode } from '../../coordinator/coordinatorMode.js'
import { Jellyfish } from './Jellyfish.js'
import type { JellyfishStatus } from './Jellyfish.js'
import { DeepSeaBackground } from './DeepSeaBackground.js'
import { SomaTitle, TITLE_HEIGHT, TITLE_WIDTH } from './SomaTitle.js'
import { FeedColumn } from './FeedColumn.js'
import {
  createGuestPassesFeed,
  createProjectOnboardingFeed,
  createRecentActivityFeed,
  createWhatsNewFeed,
} from './feedConfigs.js'
import { shouldShowProjectOnboarding, getSteps } from '../../projectOnboardingState.js'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import { resolveInferenceClientDescriptor } from '../../utils/inference/clientFactory.js'
import { renderModelSetting } from '../../utils/model/model.js'
import { useAppState } from '../../state/AppState.js'
import {
  incrementGuestPassesSeenCount,
  useShowGuestPassesUpsell,
} from './GuestPassesUpsell.js'
import {
  createOverageCreditFeed,
  incrementOverageCreditUpsellSeenCount,
  useShowOverageCreditUpsell,
} from './OverageCreditUpsell.js'

const TITLE_TOP = 1
const SIDE_PADDING = 4
const CONTENT_GAP = 6
const PROMPT_RESERVED_ROWS = 6
const SHOWCASE_MIN_WIDTH = 96
const SHOWCASE_MIN_HEIGHT = 18
const SHOWCASE_MAX_HEIGHT = 28
const JELLYFISH_LAYOUT_WIDTH = 48
const JELLYFISH_LAYOUT_HEIGHT = 19

export function SomaLanding() {
  const { columns, rows } = useTerminalSize()
  const config = getGlobalConfig()
  const display = getLogoDisplayData()
  const status: JellyfishStatus = resolveStatus(config)

  const username = config.oauthAccount?.displayName ?? ''
  const welcomeMessage = formatWelcomeMessage(username || null)
  const version = getDisplayVersion()

  const model = useMainLoopModel()
  const modelSetting = renderModelSetting(model)
  const effortValue = useAppState(s => s.effortValue)
  const effortSuffix = getEffortSuffix(model, effortValue)
  const showGuestPassesUpsell = useShowGuestPassesUpsell()
  const showOverageCreditUpsell = useShowOverageCreditUpsell()
  const publicMode = resolvePublicModeState()
  const coordinatorActive = isCoordinatorMode()

  const activities = getRecentActivitySync()
  const showOnboarding = shouldShowProjectOnboarding()
  let changelog: string[]
  try {
    changelog = getRecentReleaseNotesSync(3)
  } catch {
    changelog = []
  }

  useEffect(() => {
    if (showGuestPassesUpsell && !showOnboarding) {
      incrementGuestPassesSeenCount()
    }
  }, [showGuestPassesUpsell, showOnboarding])

  useEffect(() => {
    if (showOverageCreditUpsell && !showOnboarding && !showGuestPassesUpsell) {
      incrementOverageCreditUpsellSeenCount()
    }
  }, [showGuestPassesUpsell, showOnboarding, showOverageCreditUpsell])

  const feeds = showOnboarding
    ? [createProjectOnboardingFeed(getSteps()), createRecentActivityFeed(activities)]
    : showGuestPassesUpsell
      ? [createRecentActivityFeed(activities), createGuestPassesFeed()]
      : showOverageCreditUpsell
        ? [createRecentActivityFeed(activities), createOverageCreditFeed()]
        : [createRecentActivityFeed(activities), createWhatsNewFeed(changelog)]

  const sceneWidth = columns
  const sceneHeight = Math.max(0, Math.min(rows - PROMPT_RESERVED_ROWS, SHOWCASE_MAX_HEIGHT))
  const titleLeft = Math.max(0, Math.floor((sceneWidth - TITLE_WIDTH) / 2))
  const titleRight = Math.max(0, sceneWidth - titleLeft - TITLE_WIDTH)
  const contentTop = TITLE_TOP + TITLE_HEIGHT + 1
  const contentHeight = sceneHeight - contentTop - 1
  const jellyfishWidth = Math.min(JELLYFISH_LAYOUT_WIDTH, Math.max(40, Math.floor(sceneWidth * 0.34)))
  const panelLeft = SIDE_PADDING + jellyfishWidth + CONTENT_GAP
  const panelWidth = sceneWidth - panelLeft - SIDE_PADDING
  const compactFeeds = contentHeight >= 15 ? feeds.slice(0, 2) : feeds.slice(0, 1)
  const canWideLanding =
    sceneWidth >= SHOWCASE_MIN_WIDTH &&
    sceneHeight >= SHOWCASE_MIN_HEIGHT &&
    contentHeight >= 11 &&
    panelWidth >= 32

  if (!canWideLanding) {
    return (
      <Box flexDirection="column" width={columns} alignItems="center" paddingBottom={1}>
        <Jellyfish status={status} width={Math.min(columns, JELLYFISH_LAYOUT_WIDTH)} />
        <Box marginTop={1} flexDirection="column" alignItems="center">
          <Text>
            <Text color="jellyfish_core" bold>Soma Code</Text>
            <Text dimColor> v{version}</Text>
          </Text>
          <Text dimColor>{welcomeMessage}</Text>
        </Box>
        <InfoPanel
          cwd={display.cwd}
          model={modelSetting}
          effortSuffix={effortSuffix}
          billingType={display.billingType}
          status={status}
          publicMode={publicMode}
          coordinatorActive={coordinatorActive}
        />
      </Box>
    )
  }

  const backgroundAvoidZones = [
    { left: titleLeft - 2, top: TITLE_TOP, width: TITLE_WIDTH + 4, height: TITLE_HEIGHT + 1 },
    {
      left: SIDE_PADDING,
      top: contentTop,
      width: jellyfishWidth,
      height: Math.min(contentHeight, JELLYFISH_LAYOUT_HEIGHT),
    },
    {
      left: panelLeft - 1,
      top: contentTop,
      width: panelWidth + 2,
      height: Math.max(10, contentHeight),
    },
  ]

  return (
    <Box
      width={sceneWidth}
      height={sceneHeight}
      position="relative"
      flexDirection="column"
      paddingBottom={1}
    >
      <DeepSeaBackground width={sceneWidth} height={sceneHeight} avoidZones={backgroundAvoidZones} />

      <SomaTitle rightPad={titleRight} topOffset={TITLE_TOP} />

      <Box
        position="absolute"
        left={SIDE_PADDING}
        top={contentTop}
        width={jellyfishWidth}
        flexDirection="column"
        alignItems="center"
      >
        <Jellyfish status={status} width={jellyfishWidth} />
      </Box>

      <Box
        position="absolute"
        left={panelLeft}
        top={contentTop + 1}
        width={panelWidth}
        flexDirection="column"
      >
        <Text>
          <Text color="jellyfish_core" bold>Soma Code</Text>
          <Text dimColor> v{version}</Text>
        </Text>
        <Text dimColor>{welcomeMessage}</Text>
        <InfoPanel
          cwd={display.cwd}
          model={modelSetting}
          effortSuffix={effortSuffix}
          billingType={display.billingType}
          status={status}
          publicMode={publicMode}
          coordinatorActive={coordinatorActive}
        />
        {compactFeeds.length > 0 && (
          <Box marginTop={1}>
            <FeedColumn feeds={compactFeeds} maxWidth={panelWidth} />
          </Box>
        )}
      </Box>
    </Box>
  )
}

function resolveStatus(config: ReturnType<typeof getGlobalConfig>): JellyfishStatus {
  if (config.oauthAccount) {
    return 'ignited'
  }

  const authTokenSource = getAuthTokenSource()
  if (authTokenSource.source !== 'none') {
    return 'ignited'
  }

  const { source: apiKeySource } = getAnthropicApiKeyWithSource()
  if (apiKeySource !== 'none') {
    return 'ignited'
  }

  try {
    const descriptor = resolveInferenceClientDescriptor()
    if (descriptor.provider !== 'firstParty') {
      return 'ignited'
    }
  } catch {}

  return 'quiescent'
}

function formatPublicModeLabel(publicMode: ReturnType<typeof resolvePublicModeState>): string {
  if (publicMode.mode === 'auto') {
    return publicMode.enabled ? 'auto-on' : 'auto-off'
  }
  return publicMode.mode
}

function InfoPanel({ cwd, model, effortSuffix, billingType, status, publicMode, coordinatorActive }: {
  cwd: string
  model: string
  effortSuffix: string
  billingType: string
  status: JellyfishStatus
  publicMode: ReturnType<typeof resolvePublicModeState>
  coordinatorActive: boolean
}) {
  const statusLabel = status === 'ignited'
    ? <Text color="jellyfish_core">● ignited</Text>
    : <Text color="jellyfish_core_dim">○ quiescent</Text>
  const publicModeLabel = formatPublicModeLabel(publicMode)
  const publicModeColor = publicMode.enabled ? 'jellyfish_core' : 'jellyfish_core_dim'
  const coordinatorColor = coordinatorActive ? 'jellyfish_core' : 'jellyfish_core_dim'

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>
        <Text dimColor>workspace </Text>
        <Text>{cwd}</Text>
      </Text>
      <Text dimColor>
        <Text dimColor>model </Text>
        <Text>{model}{effortSuffix}</Text>
      </Text>
      <Text dimColor>
        <Text dimColor>billing </Text>
        <Text>{billingType}</Text>
      </Text>
      <Text dimColor>
        <Text dimColor>status </Text>
        {statusLabel}
      </Text>
      <Text dimColor>
        <Text dimColor>modes </Text>
        <Text color={publicModeColor}>public {publicModeLabel}</Text>
        <Text dimColor> · </Text>
        <Text color={coordinatorColor}>coord {coordinatorActive ? 'on' : 'off'}</Text>
      </Text>
    </Box>
  )
}


