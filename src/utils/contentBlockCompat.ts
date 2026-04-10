import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'

export type CompatibleContentBlockParam =
  | ContentBlockParam
  | BetaContentBlockParam

export function asContentBlockParams(
  blocks: readonly CompatibleContentBlockParam[],
): ContentBlockParam[] {
  return blocks as ContentBlockParam[]
}

export function asBetaContentBlockParam(
  block: CompatibleContentBlockParam,
): BetaContentBlockParam {
  return block as BetaContentBlockParam
}
