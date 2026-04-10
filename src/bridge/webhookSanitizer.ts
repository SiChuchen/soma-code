import type { ContentBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'

const GITHUB_WEBHOOK_ACTIVITY_TAG = 'github-webhook-activity'

function wrapWebhookText(text: string): string {
  if (!text.trim()) {
    return text
  }
  if (text.startsWith(`<${GITHUB_WEBHOOK_ACTIVITY_TAG}>`)) {
    return text
  }
  return `<${GITHUB_WEBHOOK_ACTIVITY_TAG}>
${text}
</${GITHUB_WEBHOOK_ACTIVITY_TAG}>`
}

export function sanitizeInboundWebhookContent(
  content: string | Array<ContentBlockParam>,
): string | Array<ContentBlockParam> {
  if (typeof content === 'string') {
    return wrapWebhookText(content)
  }

  const firstTextIndex = content.findIndex(block => block.type === 'text')
  if (firstTextIndex === -1) {
    return content
  }

  const firstTextBlock = content[firstTextIndex]
  if (!firstTextBlock || firstTextBlock.type !== 'text') {
    return content
  }

  return [
    ...content.slice(0, firstTextIndex),
    {
      ...firstTextBlock,
      text: wrapWebhookText((firstTextBlock as TextBlockParam).text),
    },
    ...content.slice(firstTextIndex + 1),
  ]
}
