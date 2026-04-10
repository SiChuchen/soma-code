import * as React from 'react'
import { getOriginalCwd } from '../../bootstrap/state.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import type { ToolUseContext } from '../../Tool.js'
import type {
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'
import { getProjectConfigPath } from '../../utils/configPaths.js'
import { settingsChangeDetector } from '../../utils/settings/changeDetector.js'
import {
  getRelativeSettingsFilePathForSource,
  getSettingsForSource,
  updateSettingsForSource,
} from '../../utils/settings/settings.js'

const UNAVAILABLE_MESSAGE =
  'Assistant install and setup flows are unavailable in this reconstructed snapshot.'
const SETTINGS_PATH = getRelativeSettingsFilePathForSource('projectSettings')
const COMMON_HELP_ARGS = new Set(['help', '-h', '--help'])

function getConfiguredAssistantName(): string | undefined {
  const rawName = getSettingsForSource('projectSettings')?.assistantName
  if (typeof rawName !== 'string') {
    return undefined
  }

  const trimmed = rawName.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function getAssistantStatusMessage(context: LocalJSXCommandContext): string {
  const projectSettings = getSettingsForSource('projectSettings')
  const configured = projectSettings?.assistant
  const configuredLabel =
    configured === true ? 'on' : configured === false ? 'off' : 'unset'
  const currentSession = context.getAppState().kairosEnabled ? 'active' : 'inactive'
  const name = getConfiguredAssistantName() ?? 'assistant (default)'

  return (
    'Assistant mode status\n' +
    `- Current session: ${currentSession}\n` +
    `- Project setting: ${configuredLabel}\n` +
    `- Assistant name: ${name}\n` +
    `- Settings file: ${SETTINGS_PATH}\n\n` +
    'Use /assistant on, /assistant off, /assistant name <value>, or /assistant name clear.\n' +
    'Changes are local-only and apply to new sessions.'
  )
}

function persistAssistantSettings(
  patch: { assistant?: boolean; assistantName?: string | undefined },
  failurePrefix: string,
): string | Error {
  const result = updateSettingsForSource('projectSettings', patch)
  if (result.error) {
    return new Error(`${failurePrefix}: ${result.error.message}`)
  }

  settingsChangeDetector.notifyChange('projectSettings')
  return SETTINGS_PATH
}

function enableAssistantMode(): string | Error {
  return persistAssistantSettings(
    { assistant: true },
    'Failed to enable assistant mode',
  )
}

function disableAssistantMode(): string | Error {
  return persistAssistantSettings(
    { assistant: false },
    'Failed to disable assistant mode',
  )
}

function setAssistantName(name: string | undefined): string | Error {
  return persistAssistantSettings(
    { assistantName: name },
    'Failed to update assistant name',
  )
}

function getHelpText(): string {
  return (
    'Usage: /assistant [status|on|off|name <value>]\n\n' +
    'Local assistant mode management:\n' +
    '- /assistant or /assistant status: show current local assistant settings\n' +
    '- /assistant on: enable assistant mode in project settings\n' +
    '- /assistant off: disable assistant mode in project settings\n' +
    '- /assistant name <value>: set the local assistant display name\n' +
    '- /assistant name clear: reset the assistant display name\n\n' +
    `Writes to ${SETTINGS_PATH}. Changes apply to new sessions only.`
  )
}

type NewInstallWizardProps = {
  defaultDir: string
  onInstalled: (dir: string) => void
  onCancel: () => void
  onError: (message: string) => void
}

export async function computeDefaultInstallDir(): Promise<string> {
  return getProjectConfigPath(getOriginalCwd(), 'assistant')
}

export function NewInstallWizard({
  defaultDir,
  onCancel,
  onError,
}: NewInstallWizardProps): React.ReactNode {
  useKeybinding('confirm:yes', () => onError(UNAVAILABLE_MESSAGE), {
    context: 'Confirmation',
  })

  return (
    <Dialog
      title="Assistant Install Unavailable"
      subtitle="Compatibility fallback for the reconstructed snapshot"
      onCancel={onCancel}
    >
      <Box flexDirection="column" gap={1}>
        <Text>{UNAVAILABLE_MESSAGE}</Text>
        <Text dimColor>Suggested install directory: {defaultDir}</Text>
        <Text dimColor>
          Press Enter to surface the compatibility error, or Esc to cancel.
        </Text>
      </Box>
    </Dialog>
  )
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: ToolUseContext & LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> {
  const normalizedArgs = (args ?? '').trim()

  if (normalizedArgs === '' || normalizedArgs === 'status' || normalizedArgs === 'current') {
    onDone(getAssistantStatusMessage(context), {
      display: 'system',
    })
    return null
  }

  if (COMMON_HELP_ARGS.has(normalizedArgs)) {
    onDone(getHelpText(), {
      display: 'system',
    })
    return null
  }

  if (
    normalizedArgs === 'on' ||
    normalizedArgs === 'enable' ||
    normalizedArgs === 'true'
  ) {
    const result = enableAssistantMode()
    onDone(
      result instanceof Error
        ? result.message
        : `Enabled assistant mode in ${result}. New sessions in this project will start in assistant mode.`,
      {
        display: 'system',
      },
    )
    return null
  }

  if (
    normalizedArgs === 'off' ||
    normalizedArgs === 'disable' ||
    normalizedArgs === 'false'
  ) {
    const result = disableAssistantMode()
    onDone(
      result instanceof Error
        ? result.message
        : `Disabled assistant mode in ${result}. Current sessions are unchanged.`,
      {
        display: 'system',
      },
    )
    return null
  }

  if (
    normalizedArgs === 'install' ||
    normalizedArgs === 'setup' ||
    normalizedArgs === 'connect'
  ) {
    onDone(
      `${UNAVAILABLE_MESSAGE}\n\nThis slash command currently manages local assistant settings only.`,
      {
        display: 'system',
      },
    )
    return null
  }

  if (normalizedArgs.startsWith('name ')) {
    const rawName = normalizedArgs.slice('name '.length).trim()
    if (rawName === '') {
      onDone('Usage: /assistant name <value>|clear', {
        display: 'system',
      })
      return null
    }

    const clearName =
      rawName === 'clear' ||
      rawName === 'reset' ||
      rawName === 'unset' ||
      rawName === 'default'
    const result = setAssistantName(clearName ? undefined : rawName)
    onDone(
      result instanceof Error
        ? result.message
        : clearName
          ? `Reset assistant name in ${result}. New sessions will use the default name "assistant".`
          : `Set assistant name to "${rawName}" in ${result}. Changes apply to new sessions.`,
      {
        display: 'system',
      },
    )
    return null
  }

  onDone(
    `Unknown assistant command: ${normalizedArgs}\n\n${getHelpText()}`,
    {
      display: 'system',
    },
  )

  return null
}
