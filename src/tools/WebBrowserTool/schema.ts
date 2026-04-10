import { z } from 'zod/v4'
import { lazySchema } from '../../utils/lazySchema.js'

export const WEB_BROWSER_TOOL_NAME = 'WebBrowser'
export const WEB_BROWSER_TOOL_DESCRIPTION =
  'Inspect or interact with web pages in the built-in browser panel.'
export const WEB_BROWSER_TOOL_PROMPT = `Use WebBrowser to automate an isolated development browser session. Prefer it for local dev servers, screenshots, console inspection, network inspection, and lightweight page interaction. Supported actions in this build are: navigate, snapshot, click, type, wait, evaluate, screenshot, console, network, and close.`
export const WEB_BROWSER_UNAVAILABLE_MESSAGE =
  'Web browser automation is unavailable in this reconstructed snapshot. The WebBrowser tool shell exists, but no browser backend is wired in yet.'

export const WEB_BROWSER_ACTION_SCHEMA = z.enum([
  'navigate',
  'snapshot',
  'click',
  'type',
  'wait',
  'evaluate',
  'screenshot',
  'console',
  'network',
  'close',
])

const inputSchema = lazySchema(() =>
  z.discriminatedUnion('action', [
    z.object({
      action: z.literal('navigate'),
      url: z.string().min(1),
      waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
    }),
    z.object({
      action: z.literal('snapshot'),
      format: z.enum(['accessibility', 'text']).optional(),
    }),
    z.object({
      action: z.literal('click'),
      ref: z.string().optional(),
      selector: z.string().optional(),
      text: z.string().optional(),
      doubleClick: z.boolean().optional(),
    }),
    z.object({
      action: z.literal('type'),
      ref: z.string().optional(),
      selector: z.string().optional(),
      text: z.string(),
      submit: z.boolean().optional(),
    }),
    z.object({
      action: z.literal('wait'),
      ms: z.number().int().positive().optional(),
      text: z.string().optional(),
      textGone: z.string().optional(),
    }),
    z.object({
      action: z.literal('evaluate'),
      expression: z.string().min(1),
    }),
    z.object({
      action: z.literal('screenshot'),
      fullPage: z.boolean().optional(),
    }),
    z.object({
      action: z.literal('console'),
      pattern: z.string().optional(),
      errorsOnly: z.boolean().optional(),
    }),
    z.object({
      action: z.literal('network'),
      urlPattern: z.string().optional(),
      includeBodies: z.boolean().optional(),
    }),
    z.object({
      action: z.literal('close'),
    }),
  ]),
)

export type InputSchema = ReturnType<typeof inputSchema>
export type WebBrowserInput = z.infer<InputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    available: z.boolean(),
    action: WEB_BROWSER_ACTION_SCHEMA.optional(),
    message: z.string(),
    page: z
      .object({
        url: z.string(),
        title: z.string().optional(),
      })
      .optional(),
    data: z.unknown().optional(),
  }),
)

export type OutputSchema = ReturnType<typeof outputSchema>
export type WebBrowserOutput = z.infer<OutputSchema>
export type WebBrowserAction = z.infer<typeof WEB_BROWSER_ACTION_SCHEMA>

export function getWebBrowserInputSchema(): InputSchema {
  return inputSchema()
}

export function getWebBrowserOutputSchema(): OutputSchema {
  return outputSchema()
}

export function createUnavailableWebBrowserOutput(
  action: WebBrowserAction,
  message = WEB_BROWSER_UNAVAILABLE_MESSAGE,
): WebBrowserOutput {
  return {
    available: false,
    action,
    message,
  }
}
