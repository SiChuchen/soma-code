import { describe, expect, test } from 'bun:test'
import { computeAuthStatusSnapshot } from './auth.js'

describe('computeAuthStatusSnapshot', () => {
  test('does not treat third-party api keys as Claude login', () => {
    expect(
      computeAuthStatusSnapshot({
        apiKeySource: 'ANTHROPIC_API_KEY',
        apiProvider: 'openaiCompatible',
        authTokenSource: 'none',
      }),
    ).toMatchObject({
      apiProvider: 'openaiCompatible',
      authMethod: 'none',
      loggedIn: false,
      thirdPartyProviderConfigured: true,
    })
  })

  test('does not treat manual first-party api keys as Claude login', () => {
    expect(
      computeAuthStatusSnapshot({
        apiKeySource: 'ANTHROPIC_API_KEY',
        apiProvider: 'firstParty',
        authTokenSource: 'none',
      }),
    ).toMatchObject({
      apiProvider: 'firstParty',
      authMethod: 'none',
      loggedIn: false,
      thirdPartyProviderConfigured: false,
    })
  })

  test('reports claude.ai oauth as logged in with account details', () => {
    expect(
      computeAuthStatusSnapshot({
        apiKeySource: 'none',
        apiProvider: 'firstParty',
        authTokenSource: 'claude.ai',
        oauthAccount: {
          emailAddress: 'user@example.com',
          organizationName: 'Example Org',
          organizationUuid: 'org_123',
        },
        subscriptionType: 'pro',
      }),
    ).toEqual({
      apiProvider: 'firstParty',
      authMethod: 'claude.ai',
      email: 'user@example.com',
      loggedIn: true,
      orgId: 'org_123',
      orgName: 'Example Org',
      subscriptionType: 'pro',
      thirdPartyProviderConfigured: false,
    })
  })

  test('treats login-managed api keys as Claude console auth', () => {
    expect(
      computeAuthStatusSnapshot({
        apiKeySource: '/login managed key',
        apiProvider: 'firstParty',
        authTokenSource: 'none',
      }),
    ).toMatchObject({
      apiKeySource: '/login managed key',
      apiProvider: 'firstParty',
      authMethod: 'console',
      loggedIn: true,
      thirdPartyProviderConfigured: false,
    })
  })
})
