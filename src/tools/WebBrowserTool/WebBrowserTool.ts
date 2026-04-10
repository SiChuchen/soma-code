import { buildTool, type ToolDef } from '../../Tool.js'
import {
  getWebBrowserUnavailableMessage,
  getWebBrowserRuntime,
  isWebBrowserRuntimeAvailable,
} from './runtime.js'
import {
  getWebBrowserInputSchema,
  getWebBrowserOutputSchema,
  WEB_BROWSER_TOOL_DESCRIPTION,
  WEB_BROWSER_TOOL_PROMPT,
  WEB_BROWSER_TOOL_NAME,
  type InputSchema,
  type OutputSchema,
  type WebBrowserAction,
  type WebBrowserInput,
  type WebBrowserOutput as Output,
} from './schema.js'

function renderWebBrowserToolUseMessage(
  input: Partial<WebBrowserInput>,
): string | null {
  const action = input.action as WebBrowserAction | undefined
  if (!action) {
    return null
  }

  switch (action) {
    case 'navigate': {
      const navigateInput = input as Partial<
        Extract<WebBrowserInput, { action: 'navigate' }>
      >
      return `open ${typeof navigateInput.url === 'string' ? navigateInput.url : 'page'}`
    }
    case 'snapshot':
      return 'capture page snapshot'
    case 'click':
      return 'click page element'
    case 'type':
      return 'type into page'
    case 'wait':
      return 'wait for page state'
    case 'evaluate':
      return 'evaluate page script'
    case 'screenshot':
      return 'capture screenshot'
    case 'console':
      return 'read console output'
    case 'network':
      return 'read network requests'
    case 'close':
      return 'close browser session'
  }
}

export const WebBrowserTool = buildTool({
  name: WEB_BROWSER_TOOL_NAME,
  searchHint: 'open or interact with web pages in a browser panel',
  shouldDefer: true,
  maxResultSizeChars: 100_000,
  get inputSchema(): InputSchema {
    return getWebBrowserInputSchema()
  },
  get outputSchema(): OutputSchema {
    return getWebBrowserOutputSchema()
  },
  isEnabled() {
    return isWebBrowserRuntimeAvailable()
  },
  isConcurrencySafe() {
    return false
  },
  isReadOnly() {
    return false
  },
  async description() {
    return WEB_BROWSER_TOOL_DESCRIPTION
  },
  async prompt() {
    return isWebBrowserRuntimeAvailable()
      ? WEB_BROWSER_TOOL_PROMPT
      : getWebBrowserUnavailableMessage()
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: output.message,
    }
  },
  renderToolUseMessage(input) {
    return renderWebBrowserToolUseMessage(input)
  },
  renderToolResultMessage(output) {
    return output.message
  },
  async call(input, context) {
    return {
      data: await getWebBrowserRuntime().execute(input, context),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
