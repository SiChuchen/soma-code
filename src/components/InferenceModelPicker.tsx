import capitalize from 'lodash-es/capitalize.js'
import * as React from 'react'
import { useExitOnCtrlCDWithKeybindings } from 'src/hooks/useExitOnCtrlCDWithKeybindings.js'
import { Box, Text } from '../ink.js'
import { useKeybindings } from '../keybindings/useKeybinding.js'
import { useAppState, useSetAppState } from '../state/AppState.js'
import {
  convertEffortValueToLevel,
  type EffortLevel,
  getDefaultEffortForModel,
  getEffortLabelForModel,
  modelSupportsEffort,
  modelSupportsMaxEffort,
  resolvePickerEffortPersistence,
  toPersistableEffort,
} from '../utils/effort.js'
import {
  getSettingsForSource,
  updateSettingsForSource,
} from '../utils/settings/settings.js'
import type { InferenceModelPickerOption } from '../utils/inference/modelPicker.js'
import { ConfigurableShortcutHint } from './ConfigurableShortcutHint.js'
import { Select } from './CustomSelect/index.js'
import { Byline } from './design-system/Byline.js'
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js'
import { Pane } from './design-system/Pane.js'
import { effortLevelToSymbol } from './EffortIndicator.js'

const NO_PREFERENCE = '__NO_PREFERENCE__'

type DefaultOption =
  | false
  | {
      description: string
      label: string
    }

type Props = {
  defaultOption?: DefaultOption
  headerText?: string
  initial: string | null
  isStandaloneCommand?: boolean
  onCancel?: () => void
  onSelect: (model: string | null, effort?: EffortLevel | undefined) => void
  options: InferenceModelPickerOption[]
  resolveEffortModel?: (model: string | null) => string | undefined
}

export function InferenceModelPicker({
  defaultOption,
  headerText,
  initial,
  isStandaloneCommand,
  onCancel,
  onSelect,
  options,
  resolveEffortModel,
}: Props): React.ReactNode {
  const setAppState = useSetAppState()
  const exitState = useExitOnCtrlCDWithKeybindings()
  const effortValue = useAppState(s => s.effortValue)
  const [hasToggledEffort, setHasToggledEffort] = React.useState(false)

  const baseOptions = React.useMemo(() => {
    if (defaultOption === false) {
      return options
    }

    return [
      {
        value: null,
        label: defaultOption?.label ?? 'Use connection default',
        description:
          defaultOption?.description ??
          'Clear the explicit default and fall back to the saved connection default.',
      },
      ...options,
    ]
  }, [defaultOption, options])

  const optionsWithInitial = React.useMemo(() => {
    if (initial && !baseOptions.some(option => option.value === initial)) {
      return [
        {
          value: initial,
          label: initial,
          description: 'Current model',
        },
        ...baseOptions,
      ]
    }

    return baseOptions
  }, [baseOptions, initial])

  const selectOptions = React.useMemo(
    () =>
      optionsWithInitial.map(option => ({
        ...option,
        value: option.value === null ? NO_PREFERENCE : option.value,
      })),
    [optionsWithInitial],
  )

  const initialValue = initial === null ? NO_PREFERENCE : initial
  const [focusedValue, setFocusedValue] = React.useState(initialValue)
  const defaultFocusValue = selectOptions.some(
    option => option.value === initialValue,
  )
    ? initialValue
    : (selectOptions[0]?.value ?? undefined)
  const visibleOptionCount = Math.min(10, selectOptions.length)
  const hiddenOptionCount = Math.max(0, selectOptions.length - visibleOptionCount)
  const supportsEffortSelection = resolveEffortModel !== undefined

  const resolveRemoteModelForValue = React.useCallback(
    (value: string | undefined): string | undefined => {
      if (!resolveEffortModel) {
        return undefined
      }
      if (!value || value === NO_PREFERENCE) {
        return resolveEffortModel(null)
      }
      return resolveEffortModel(value)
    },
    [resolveEffortModel],
  )

  const getDefaultEffortLevelForValue = React.useCallback(
    (value: string | undefined): EffortLevel => {
      const remoteModel = resolveRemoteModelForValue(value)
      const defaultValue =
        remoteModel !== undefined
          ? getDefaultEffortForModel(remoteModel)
          : undefined

      return defaultValue !== undefined
        ? convertEffortValueToLevel(defaultValue)
        : 'high'
    },
    [resolveRemoteModelForValue],
  )

  const initialEffort = React.useMemo(
    () =>
      effortValue !== undefined
        ? convertEffortValueToLevel(effortValue)
        : getDefaultEffortLevelForValue(initialValue),
    [effortValue, getDefaultEffortLevelForValue, initialValue],
  )
  const [effort, setEffort] = React.useState<EffortLevel>(initialEffort)

  const focusedRemoteModel = resolveRemoteModelForValue(focusedValue)
  const focusedSupportsEffort = Boolean(
    supportsEffortSelection &&
      focusedRemoteModel &&
      modelSupportsEffort(focusedRemoteModel),
  )
  const focusedSupportsMax = Boolean(
    focusedRemoteModel && modelSupportsMaxEffort(focusedRemoteModel),
  )
  const focusedDefaultEffort = getDefaultEffortLevelForValue(focusedValue)
  const displayEffort =
    effort === 'max' && !focusedSupportsMax ? 'high' : effort
  const displayEffortLabel = getEffortLabelForModel(
    displayEffort,
    focusedRemoteModel,
  )
  const topEffortLabel = getEffortLabelForModel('max', focusedRemoteModel)

  const handleFocus = React.useCallback(
    (value: string) => {
      setFocusedValue(value)
      if (!hasToggledEffort && effortValue === undefined) {
        setEffort(getDefaultEffortLevelForValue(value))
      }
    },
    [effortValue, getDefaultEffortLevelForValue, hasToggledEffort],
  )

  const handleCycleEffort = React.useCallback(
    (direction: 'left' | 'right') => {
      if (!focusedSupportsEffort) {
        return
      }

      setEffort(prev =>
        cycleEffortLevel(
          prev ?? focusedDefaultEffort,
          direction,
          focusedSupportsMax,
        ),
      )
      setHasToggledEffort(true)
    },
    [focusedDefaultEffort, focusedSupportsEffort, focusedSupportsMax],
  )

  useKeybindings(
    supportsEffortSelection
      ? {
          'modelPicker:decreaseEffort': () => handleCycleEffort('left'),
          'modelPicker:increaseEffort': () => handleCycleEffort('right'),
        }
      : {},
    { context: 'ModelPicker' },
  )

  const handleSelect = React.useCallback(
    (value: string) => {
      let selectedEffort: EffortLevel | undefined = undefined

      if (supportsEffortSelection) {
        const effortLevel = resolvePickerEffortPersistence(
          effort,
          getDefaultEffortLevelForValue(value),
          getSettingsForSource('userSettings')?.effortLevel,
          hasToggledEffort,
        )
        const persistable = toPersistableEffort(effortLevel)

        if (persistable !== undefined) {
          updateSettingsForSource('userSettings', {
            effortLevel: persistable,
          })
        }

        setAppState(prev => ({
          ...prev,
          effortValue: effortLevel,
        }))

        const selectedRemoteModel = resolveRemoteModelForValue(value)
        selectedEffort =
          hasToggledEffort &&
          selectedRemoteModel !== undefined &&
          modelSupportsEffort(selectedRemoteModel)
            ? effort
            : undefined
      }

      onSelect(value === NO_PREFERENCE ? null : value, selectedEffort)
    },
    [
      effort,
      getDefaultEffortLevelForValue,
      hasToggledEffort,
      onSelect,
      resolveRemoteModelForValue,
      setAppState,
      supportsEffortSelection,
    ],
  )

  const content = (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text color="remember" bold>
          Select model
        </Text>
        <Text dimColor>
          {headerText ??
            'Select from the models currently configured in settings.inference.'}
        </Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        <Select
          defaultFocusValue={defaultFocusValue}
          defaultValue={initialValue}
          options={selectOptions}
          onCancel={onCancel}
          onChange={handleSelect}
          onFocus={handleFocus}
          visibleOptionCount={visibleOptionCount}
        />
        {hiddenOptionCount > 0 ? (
          <Box paddingLeft={3}>
            <Text dimColor>and {hiddenOptionCount} more...</Text>
          </Box>
        ) : null}
      </Box>
      {supportsEffortSelection ? (
        <Box marginBottom={1} flexDirection="column">
          <Box
            borderStyle="round"
            borderColor={focusedSupportsEffort ? 'permission' : 'subtle'}
            paddingX={1}
            paddingY={1}
            flexDirection="column"
          >
            <Text color="remember" bold>
              Reasoning effort
            </Text>
            {focusedSupportsEffort ? (
              <>
                <Text bold>
                  <Text color="claude">
                    {effortLevelToSymbol(displayEffort)}
                  </Text>{' '}
                  {formatEffortLabel(displayEffortLabel)} effort
                  {displayEffort === focusedDefaultEffort ? ' (default)' : ''}
                </Text>
                <Text color="subtle">Use ← → to adjust</Text>
                <Text color="claude">
                  {renderEffortProgress(
                    displayEffort,
                    focusedSupportsMax,
                    topEffortLabel,
                  )}
                </Text>
                <EffortLevelScale
                  current={displayEffort}
                  includeMax={focusedSupportsMax}
                  topEffortLabel={topEffortLabel}
                />
              </>
            ) : (
              <Text color="subtle">
                Effort not supported for this configured model
              </Text>
            )}
          </Box>
        </Box>
      ) : null}
      {isStandaloneCommand ? (
        <Text dimColor italic>
          {exitState.pending ? (
            <>Press {exitState.keyName} again to exit</>
          ) : (
            <Byline>
              <KeyboardShortcutHint shortcut="Enter" action="confirm" />
              <ConfigurableShortcutHint
                action="select:cancel"
                context="Select"
                fallback="Esc"
                description="exit"
              />
            </Byline>
          )}
        </Text>
      ) : null}
    </Box>
  )

  if (!isStandaloneCommand) {
    return content
  }

  return <Pane color="permission">{content}</Pane>
}

function EffortLevelScale({
  current,
  includeMax,
  topEffortLabel,
}: {
  current: EffortLevel
  includeMax: boolean
  topEffortLabel: string
}): React.ReactNode {
  const levels: EffortLevel[] = includeMax
    ? ['low', 'medium', 'high', 'max']
    : ['low', 'medium', 'high']

  return (
    <Text>
      {levels.map((level, index) => (
        <React.Fragment key={level}>
          <Text color={level === current ? 'claude' : 'subtle'} bold={level === current}>
            {level === current ? '●' : '○'}{' '}
            {formatEffortLabel(level === 'max' ? topEffortLabel : level)}
          </Text>
          {index < levels.length - 1 ? <Text dimColor>{'  '}</Text> : null}
        </React.Fragment>
      ))}
    </Text>
  )
}

function renderEffortProgress(
  current: EffortLevel,
  includeMax: boolean,
  topEffortLabel: string,
): string {
  const levels: EffortLevel[] = includeMax
    ? ['low', 'medium', 'high', 'max']
    : ['low', 'medium', 'high']
  const currentIndex = levels.indexOf(current)
  const totalSegments = levels.length * 2
  const filledSegments = Math.max(0, (currentIndex + 1) * 2)

  return `${formatEffortLabel(levels[0]!).toUpperCase()} [${Array.from({
    length: totalSegments,
  }, (_, index) => (index < filledSegments ? '#' : '-')).join('')}] ${formatEffortLabel(
    levels[levels.length - 1] === 'max' ? topEffortLabel : levels[levels.length - 1]!,
  ).toUpperCase()}`
}

function cycleEffortLevel(
  current: EffortLevel,
  direction: 'left' | 'right',
  includeMax: boolean,
): EffortLevel {
  const levels: EffortLevel[] = includeMax
    ? ['low', 'medium', 'high', 'max']
    : ['low', 'medium', 'high']
  const idx = levels.indexOf(current)
  const currentIndex = idx !== -1 ? idx : levels.indexOf('high')

  if (direction === 'right') {
    return levels[(currentIndex + 1) % levels.length]!
  }

  return levels[(currentIndex - 1 + levels.length) % levels.length]!
}

function formatEffortLabel(label: string): string {
  return label === 'xhigh' ? 'XHigh' : capitalize(label)
}
