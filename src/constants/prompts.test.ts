import { describe, expect, test } from 'bun:test'
import { getRuntimeModelPromptDetails } from './prompts.js'

describe('getRuntimeModelPromptDetails', () => {
  test('uses provider-route wording for third-party anthropic-compatible endpoints', () => {
    const details = getRuntimeModelPromptDetails('claude-opus-4-6', {
      api: {
        compatibility: 'anthropic',
        mode: 'preset',
        preset: 'minimax',
      },
    })

    expect(details.modelDescription).toContain(
      'Current /model selection: claude-opus-4-6',
    )
    expect(details.modelDescription).toContain('Current provider route: MiniMax')
    expect(details.modelDescription).toContain(
      'Configured provider model: claude-opus-4-6',
    )
    expect(details.modelDescription).toContain(
      "not independent proof of your exact model identity",
    )
    expect(details.modelDescription).toContain(
      'cannot directly verify it',
    )
    expect(details.modelDescription).toContain(
      'rather than built-in defaults',
    )
    expect(details.modelDescription).not.toContain(
      'answer with this configured route rather than Claude defaults',
    )
    expect(details.shouldMentionClaudeFamily).toBe(false)
    expect(details.shouldMentionFastModeFrontierModel).toBe(false)
  })

  test('uses current /model selection wording for official account routes', () => {
    const details = getRuntimeModelPromptDetails('sonnet', {
      inference: {
        version: 1,
        endpoints: [
          {
            id: 'claude-official',
            name: 'Official account',
            kind: 'official_claude',
            transport: 'direct',
            protocol: 'anthropic',
            authMode: 'claude_oauth',
          },
        ],
        models: [
          {
            id: 'claude-sonnet-4-6',
            label: 'Claude Sonnet 4.6',
            endpointId: 'claude-official',
            remoteModel: 'claude-sonnet-4-6',
          },
        ],
        defaults: {
          modelId: 'claude-sonnet-4-6',
        },
      },
    })

    expect(details.modelDescription).toContain('Current /model selection: sonnet')
    expect(details.modelDescription).toContain('Current configured model:')
    expect(details.modelDescription).toContain(
      'The exact model ID is claude-sonnet-4-6',
    )
    expect(details.modelDescription).toContain(
      "This is somacode's current model setting",
    )
    expect(details.modelDescription).toContain(
      'do not claim certainty based only on configuration',
    )
    expect(details.modelDescription).toContain(
      'cannot directly verify it',
    )
    expect(details.modelDescription).toContain(
      'rather than built-in defaults',
    )
    expect(details.modelDescription).not.toContain(
      'If asked which model you are using',
    )
    expect(details.shouldMentionClaudeFamily).toBe(true)
    expect(details.shouldMentionFastModeFrontierModel).toBe(true)
  })
})
