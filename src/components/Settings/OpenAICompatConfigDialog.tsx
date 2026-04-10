import figures from 'figures'
import React, { useState } from 'react'
import { Box, Text } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import { Dialog } from '../design-system/Dialog.js'
import TextInput from '../TextInput.js'

type Props = {
  description?: React.ReactNode
  emptyHint: string
  initialValue?: string
  mask?: string
  onCancel: () => void
  onComplete: (value: string | undefined) => void
  placeholder: string
  title: string
}

export function OpenAICompatConfigDialog({
  description,
  emptyHint,
  initialValue,
  mask,
  onCancel,
  onComplete,
  placeholder,
  title,
}: Props): React.ReactNode {
  const [value, setValue] = useState(initialValue ?? '')
  const [cursorOffset, setCursorOffset] = useState((initialValue ?? '').length)

  useKeybinding('confirm:no', onCancel, { context: 'Settings' })

  function handleSubmit(): void {
    const trimmed = value.trim()
    onComplete(trimmed || undefined)
  }

  return (
    <Dialog
      title={title}
      subtitle={description}
      onCancel={onCancel}
      hideBorder
      isCancelActive={false}
    >
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1}>
          <Text>{figures.pointer}</Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            focus
            showCursor
            mask={mask}
            placeholder={placeholder}
            columns={70}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
          />
        </Box>
        <Text dimColor>{emptyHint}</Text>
      </Box>
    </Dialog>
  )
}

