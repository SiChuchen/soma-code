// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import * as React from 'react'
import { Suspense, useState } from 'react'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import { useExitOnCtrlCDWithKeybindings } from '../../hooks/useExitOnCtrlCDWithKeybindings.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import {
  useIsInsideModal,
  useModalOrTerminalSize,
} from '../../context/modalContext.js'
import { Pane } from '../design-system/Pane.js'
import { Tabs, Tab } from '../design-system/Tabs.js'
import { Text } from '../../ink.js'
import { Status, buildDiagnostics } from './Status.js'
import { Config } from './Config.js'
import { Usage } from './Usage.js'
import type {
  LocalJSXCommandContext,
  CommandResultDisplay,
} from '../../commands.js'

type Props = {
  onClose: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
    },
  ) => void
  context: LocalJSXCommandContext
  defaultTab: 'Status' | 'Config' | 'Usage' | 'Gates'
}

function getSettingsDismissMessage(tab: string): string {
  switch (tab) {
    case 'Config':
      return 'Config dialog dismissed'
    case 'Usage':
      return 'Usage dialog dismissed'
    case 'Gates':
      return 'Gates dialog dismissed'
    case 'Status':
    default:
      return 'Status dialog dismissed'
  }
}

function getTabTitle(selectedTab: string, tabId: string, label: string): string {
  return selectedTab === tabId ? `◀ ${label} ▶` : label
}

export function Settings({
  onClose,
  context,
  defaultTab,
}: Props): React.ReactNode {
  const [selectedTab, setSelectedTab] = useState<string>(defaultTab)
  const [tabsHidden, setTabsHidden] = useState(false)
  const [configOwnsEsc, setConfigOwnsEsc] = useState(false)
  const [gatesOwnsEsc, setGatesOwnsEsc] = useState(false)
  const insideModal = useIsInsideModal()
  const { rows } = useModalOrTerminalSize(useTerminalSize())
  const contentHeight = insideModal
    ? rows + 1
    : Math.max(15, Math.min(Math.floor(rows * 0.8), 30))
  const [diagnosticsPromise] = useState(() =>
    buildDiagnostics().catch(() => []),
  )

  useExitOnCtrlCDWithKeybindings()

  const handleEscape = (): void => {
    if (tabsHidden) {
      return
    }

    onClose(getSettingsDismissMessage(selectedTab), {
      display: 'system',
    })
  }

  useKeybinding('confirm:no', handleEscape, {
    context: 'Settings',
    isActive:
      !tabsHidden &&
      !(selectedTab === 'Config' && configOwnsEsc) &&
      !(selectedTab === 'Gates' && gatesOwnsEsc),
  })

  const tabs = [
    <Tab
      key="status"
      id="Status"
      title={getTabTitle(selectedTab, 'Status', 'Status')}
    >
      <Status context={context} diagnosticsPromise={diagnosticsPromise} />
    </Tab>,
    <Tab
      key="config"
      id="Config"
      title={getTabTitle(selectedTab, 'Config', 'Config')}
    >
      <Suspense fallback={null}>
        <Config
          context={context}
          onClose={onClose}
          setTabsHidden={setTabsHidden}
          onIsSearchModeChange={setConfigOwnsEsc}
          contentHeight={contentHeight}
        />
      </Suspense>
    </Tab>,
    <Tab
      key="usage"
      id="Usage"
      title={getTabTitle(selectedTab, 'Usage', 'Usage')}
    >
      <Usage />
    </Tab>,
  ]

  const settingsBanner = !tabsHidden ? (
    <Text dimColor>{'◀/▶ switch pages'}</Text>
  ) : undefined

  return (
    <Pane color="permission">
      <Tabs
        color="permission"
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        hidden={tabsHidden}
        initialHeaderFocused={defaultTab !== 'Config' && defaultTab !== 'Gates'}
        contentHeight={tabsHidden || insideModal ? undefined : contentHeight}
        banner={settingsBanner}
      >
        {tabs}
      </Tabs>
    </Pane>
  )
}
