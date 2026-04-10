export const BROWSER_TOOLS = [
  { name: 'tabs_context_mcp' },
  { name: 'navigate' },
  { name: 'click' },
  { name: 'fill_form' },
  { name: 'take_screenshot' },
]

export function createClaudeForChromeMcpServer(_context) {
  return {
    async connect(_transport) {},
    async close() {},
  }
}
