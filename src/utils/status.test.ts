import { describe, expect, test } from 'bun:test'
import {
  getEndpointAuthLabel,
  getInferenceConfigSourceLabel,
  getInferenceRouteSourceLabel,
} from './status.js'

type EndpointAuthLabelInput = Parameters<typeof getEndpointAuthLabel>[0]

describe('status helpers', () => {
  test('maps inference config sources to user-facing labels', () => {
    expect(getInferenceConfigSourceLabel('inference')).toBe('settings.inference')
    expect(getInferenceConfigSourceLabel('settingsApi')).toBe('settings.api')
    expect(getInferenceConfigSourceLabel('legacyEnv')).toBe('Legacy env')
  })

  test('maps route sources to user-facing labels', () => {
    expect(getInferenceRouteSourceLabel('session')).toBe('Session override')
    expect(getInferenceRouteSourceLabel('endpointDefault')).toBe(
      'Endpoint default',
    )
    expect(getInferenceRouteSourceLabel('builtin')).toBe('Built-in default')
  })

  test('reports saved api keys explicitly', () => {
    expect(
      getEndpointAuthLabel({
        endpoint: {
          authMode: 'api_key',
        },
        endpointApiKey: 'sk-test',
      } as EndpointAuthLabelInput),
    ).toBe('API key (saved)')
  })

  test('reports claude oauth and disabled openai auth distinctly', () => {
    expect(
      getEndpointAuthLabel({
        endpoint: {
          authMode: 'claude_oauth',
        },
      } as EndpointAuthLabelInput),
    ).toBe('Official account')

    expect(
      getEndpointAuthLabel({
        endpoint: {
          authMode: 'api_key',
        },
        openAICompat: {
          disableAuth: true,
        },
      } as EndpointAuthLabelInput),
    ).toBe('Disabled')
  })
})
