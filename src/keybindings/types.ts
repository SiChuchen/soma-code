import type {
  KEYBINDING_ACTIONS,
  KEYBINDING_CONTEXTS,
} from './schema.js'

export type KeybindingContextName =
  | (typeof KEYBINDING_CONTEXTS)[number]
  | 'Scroll'
  | 'MessageActions'
  | 'Terminal'

/**
 * Runtime code already contains feature-gated and legacy action strings
 * outside the stricter JSON schema allowlist. Keep this permissive so the
 * recovered snapshot can type existing local bindings without forcing a
 * broader migration first.
 */
export type KeybindingAction =
  | (typeof KEYBINDING_ACTIONS)[number]
  | `command:${string}`
  | `scroll:${string}`
  | `selection:${string}`
  | (string & {})

export type ParsedKeystroke = {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  super: boolean
}

export type Chord = ParsedKeystroke[]

export type ParsedBinding = {
  chord: Chord
  action: KeybindingAction | null
  context: KeybindingContextName
}

export type KeybindingBlock = {
  context: KeybindingContextName
  bindings: Record<string, KeybindingAction | null>
}
