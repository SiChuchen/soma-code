import type { ReactNode, Ref } from 'react'
import type { DOMElement } from './dom.js'
import type { ClickEvent } from './events/click-event.js'
import type { FocusEvent } from './events/focus-event.js'
import type { KeyboardEvent } from './events/keyboard-event.js'
import type { Styles, TextStyles } from './styles.js'

type BaseIntrinsicProps = {
  children?: ReactNode
  ref?: Ref<DOMElement>
}

type InkBoxProps = BaseIntrinsicProps & {
  style?: Styles
  tabIndex?: number
  autoFocus?: boolean
  onClick?: (event: ClickEvent) => void
  onFocus?: (event: FocusEvent) => void
  onFocusCapture?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onBlurCapture?: (event: FocusEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyDownCapture?: (event: KeyboardEvent) => void
}

type InkTextProps = BaseIntrinsicProps & {
  style?: Styles
  textStyles?: TextStyles
}

type InkLinkProps = BaseIntrinsicProps & {
  href?: string
}

type InkRawAnsiProps = {
  rawText: string
  rawWidth: number
  rawHeight: number
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ink-box': InkBoxProps
      'ink-link': InkLinkProps
      'ink-progress': BaseIntrinsicProps
      'ink-raw-ansi': InkRawAnsiProps
      'ink-root': BaseIntrinsicProps
      'ink-text': InkTextProps
      'ink-virtual-text': InkTextProps
    }
  }
}

export {}
