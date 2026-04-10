import React, { useCallback, useEffect, useMemo } from 'react'
import { Box, Text } from '../ink.js'
import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import { getAntModelOverrideConfig, getAntModels } from '../utils/model/antModels.js'
import { Select, type OptionWithDescription } from './CustomSelect/select.js'
import { PermissionDialog } from './permissions/PermissionDialog.js'

type ModelSwitchSelection = 'switch' | 'dismiss' | 'never'

type Props = {
  onDone: (selection: string, modelAlias?: string) => void
}

const RESHOW_AFTER_MS = 24 * 60 * 60 * 1000

export function AntModelSwitchCallout({ onDone }: Props): React.ReactNode {
  const switchCallout = getAntModelOverrideConfig()?.switchCallout ?? null
  const version = switchCallout?.version ?? ''
  const targetModel = switchCallout?.modelAlias
    ? getAntModels().find(model => model.alias === switchCallout.modelAlias)
    : undefined

  useEffect(() => {
    if (!switchCallout) {
      return
    }

    saveGlobalConfig(current => ({
      ...current,
      modelSwitchCalloutLastShown: Date.now(),
      modelSwitchCalloutVersion: switchCallout.version,
      ...(current.modelSwitchCalloutVersion === switchCallout.version
        ? {}
        : { modelSwitchCalloutDismissed: false }),
    }))
  }, [switchCallout, version])

  const options = useMemo<OptionWithDescription<ModelSwitchSelection>[]>(
    () => [
      {
        label: `Switch to ${targetModel?.label ?? switchCallout?.modelAlias ?? 'recommended model'}`,
        description:
          switchCallout?.description ?? 'Switch to the configured model override.',
        value: 'switch',
        disabled: !targetModel?.alias,
      },
      {
        label: 'Keep current model',
        description: 'Dismiss this recommendation for now.',
        value: 'dismiss',
      },
      {
        label: "Don't show again",
        description: 'Hide this callout until the rollout version changes.',
        value: 'never',
      },
    ],
    [switchCallout, targetModel],
  )

  const handleCancel = useCallback((): void => {
    onDone('dismiss')
  }, [onDone])

  const handleSelect = useCallback(
    (selection: ModelSwitchSelection): void => {
      if (selection === 'switch' && targetModel?.alias) {
        onDone('switch', targetModel.alias)
        return
      }

      if (selection === 'never' && switchCallout) {
        saveGlobalConfig(current => ({
          ...current,
          modelSwitchCalloutDismissed: true,
          modelSwitchCalloutLastShown: Date.now(),
          modelSwitchCalloutVersion: switchCallout.version,
        }))
      }

      onDone('dismiss')
    },
    [onDone, switchCallout, targetModel],
  )

  if (!switchCallout) {
    return null
  }

  return (
    <PermissionDialog
      title="Recommended Model"
      subtitle={`Rollout ${switchCallout.version}`}
    >
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box marginBottom={1} flexDirection="column">
          <Text>{switchCallout.description}</Text>
          {targetModel ? (
            <Text dimColor>
              Suggested model: <Text bold>{targetModel.label}</Text>
            </Text>
          ) : null}
        </Box>
        <Select
          options={options}
          onChange={handleSelect}
          onCancel={handleCancel}
          layout="compact-vertical"
        />
      </Box>
    </PermissionDialog>
  )
}

export function shouldShowModelSwitchCallout(): boolean {
  if (process.env.USER_TYPE !== 'ant') {
    return false
  }

  const switchCallout = getAntModelOverrideConfig()?.switchCallout
  if (!switchCallout) {
    return false
  }

  if (
    switchCallout.modelAlias &&
    !getAntModels().some(model => model.alias === switchCallout.modelAlias)
  ) {
    return false
  }

  const config = getGlobalConfig()
  const sameVersion = config.modelSwitchCalloutVersion === switchCallout.version

  if (sameVersion && config.modelSwitchCalloutDismissed) {
    return false
  }

  if (
    sameVersion &&
    config.modelSwitchCalloutLastShown !== undefined &&
    Date.now() - config.modelSwitchCalloutLastShown < RESHOW_AFTER_MS
  ) {
    return false
  }

  return true
}
