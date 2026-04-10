import { randomUUID } from 'crypto'
import type { ClientOptions } from '@anthropic-ai/sdk'
import { logForDebugging } from 'src/utils/debug.js'
import { isEnvTruthy } from 'src/utils/envUtils.js'
import { modelUsesXHighEffortLabel } from 'src/utils/effort.js'
import { safeParseJSON } from 'src/utils/json.js'
import { getAPIProvider } from 'src/utils/model/providers.js'
import {
  getOpenAICompatProfileDefaults as getOpenAICompatProfileDefaultsForProfile,
  parseOpenAICompatApiFormat,
  type OpenAICompatApiFormat,
  type OpenAICompatProfileDefaults,
} from 'src/utils/openaiCompatConfig.js'

type OpenAICompatFetch = NonNullable<ClientOptions['fetch']>
type JsonPrimitive = boolean | null | number | string
type JsonValue = JsonArray | JsonObject | JsonPrimitive
type JsonArray = JsonValue[]
type JsonObject = { [key: string]: JsonValue }

type AnthropicMessageParam = {
  content: string | Array<Record<string, unknown>>
  role: 'user' | 'assistant'
}

type AnthropicOutputEffort = 'low' | 'medium' | 'high' | 'max' | undefined

type AnthropicMessageRequest = {
  frequency_penalty?: number
  logit_bias?: Record<string, unknown>
  max_tokens: number
  messages: AnthropicMessageParam[]
  model: string
  output_config?: {
    effort?: 'low' | 'medium' | 'high' | 'max'
    format?: {
      schema?: Record<string, unknown>
      type?: string
    }
  }
  seed?: number
  stop_sequences?: string[]
  stream?: boolean
  system?: string | Array<{ text?: string; type: 'text' }>
  temperature?: number
  top_p?: number
  presence_penalty?: number
  thinking?: {
    budget_tokens?: number
    type?: string
  }
  tool_choice?: Record<string, unknown>
  tools?: Array<Record<string, unknown>>
}

type OpenAICompatProtocol = 'chat_completions' | 'responses'
type ResolvedOpenAICompatRuntimeConfig = {
  apiFormat: OpenAICompatApiFormat
  apiKey?: string
  apiKeyHeaderName: string
  apiKeyScheme: string
  baseUrl?: string
  customHeaders: Record<string, string>
  disableAuth: boolean
  extraBody: JsonObject
  model?: string
}

export type OpenAICompatRuntimeConfig = {
  apiFormat?: OpenAICompatApiFormat
  apiKey?: string
  apiKeyHeaderName?: string
  apiKeyScheme?: string
  baseUrl?: string
  customHeaders?: Record<string, string>
  disableAuth?: boolean
  extraBody?: JsonObject
  model?: string
  profile?: string
}

type OpenAIToolCall = {
  function?: {
    arguments?: string
    name?: string
  }
  id?: string
  index?: number
}

type OpenAIUsage = {
  completion_tokens?: number
  input_tokens?: number
  output_tokens?: number
  prompt_tokens?: number
}

type OpenAIChoice = {
  delta?: {
    content?: string | Array<unknown> | null
    tool_calls?: OpenAIToolCall[]
  }
  finish_reason?: string | null
  message?: {
    content?: string | Array<unknown> | null
    tool_calls?: OpenAIToolCall[]
  }
}

type OpenAIResponse = {
  choices?: OpenAIChoice[]
  id?: string
  model?: string
  usage?: OpenAIUsage
}

type OpenAIResponsesOutputItem = {
  arguments?: string | null
  call_id?: string | null
  content?: Array<unknown>
  id?: string | null
  name?: string | null
  role?: string | null
  status?: string | null
  type?: string
}

type OpenAIResponsesResponse = {
  id?: string
  incomplete_details?: {
    reason?: string | null
  } | null
  model?: string
  output?: OpenAIResponsesOutputItem[]
  output_text?: string
  usage?: OpenAIUsage
}

type OpenAIResponsesEvent = {
  arguments?: string
  delta?: string
  item?: OpenAIResponsesOutputItem
  item_id?: string
  name?: string
  output_index?: number
  response?: OpenAIResponsesResponse
  text?: string
  type?: string
}

type OpenAIRequestMessage = {
  content?: string | Array<Record<string, unknown>> | null
  role: 'assistant' | 'system' | 'tool' | 'user'
  tool_call_id?: string
  tool_calls?: Array<{
    function: {
      arguments: string
      name: string
    }
    id: string
    type: 'function'
  }>
}

type ToolStreamState = {
  anthropicIndex: number
  argumentsFlushed: boolean
  bufferedArgs: string[]
  callId?: string
  id: string
  itemId?: string
  sawArgumentsDelta?: boolean
  name?: string
  pendingArgs: string[]
  started: boolean
}

type OpenAICompatReasoningEffort =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
type OpenAICompatReasoningSummary = 'auto' | 'concise' | 'detailed'
type OpenAICompatAudioFormat = 'flac' | 'mp3' | 'opus' | 'pcm16' | 'wav'
type OpenAICompatChatModality = 'audio' | 'text'
type OpenAICompatPrediction = {
  content: string
  type: 'content'
}
type OpenAICompatServiceTier =
  | 'auto'
  | 'default'
  | 'flex'
  | 'priority'
type OpenAICompatPromptCacheRetention = '24h' | 'in_memory'
type OpenAICompatTruncation = 'auto' | 'disabled'
type OpenAICompatVerbosity = 'low' | 'medium' | 'high'
type OpenAICompatPenaltyKind = 'frequency_penalty' | 'presence_penalty'
type OpenAICompatChatLogprobsConfig = {
  logprobs?: boolean
  topLogprobs?: number
}

const encoder = new TextEncoder()

const EMPTY_ANTHROPIC_USAGE = {
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  input_tokens: 0,
  output_tokens: 0,
  server_tool_use: null,
}

const EMPTY_ANTHROPIC_DELTA_USAGE = {
  ...EMPTY_ANTHROPIC_USAGE,
  iterations: null,
}

export function isOpenAICompatProvider(): boolean {
  return getAPIProvider() === 'openaiCompatible'
}

function trimRuntimeValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function resolveOpenAICompatRuntimeConfig(
  config?: OpenAICompatRuntimeConfig,
): ResolvedOpenAICompatRuntimeConfig {
  const defaults = getOpenAICompatProfileDefaults(config)
  const hasApiKeyScheme =
    config !== undefined &&
    Object.prototype.hasOwnProperty.call(config, 'apiKeyScheme')
  const hasDisableAuth =
    config !== undefined &&
    Object.prototype.hasOwnProperty.call(config, 'disableAuth')
  const apiKeyHeaderName =
    trimRuntimeValue(config?.apiKeyHeaderName) ??
    trimRuntimeValue(process.env.OPENAI_API_KEY_HEADER) ??
    defaults.apiKeyHeaderName ??
    'Authorization'
  const apiKeyScheme = hasApiKeyScheme
    ? (config?.apiKeyScheme ?? '').trim()
    : Object.prototype.hasOwnProperty.call(process.env, 'OPENAI_API_KEY_SCHEME')
      ? (process.env.OPENAI_API_KEY_SCHEME?.trim() ?? '')
      : (defaults.apiKeyScheme ?? 'Bearer')
  const disableAuth = hasDisableAuth
    ? config?.disableAuth === true
    : Object.prototype.hasOwnProperty.call(process.env, 'OPENAI_COMPAT_DISABLE_AUTH')
      ? isEnvTruthy(process.env.OPENAI_COMPAT_DISABLE_AUTH)
      : defaults.disableAuth === true

  return {
    apiFormat:
      config?.apiFormat ?? parseOpenAICompatApiFormat(process.env.OPENAI_COMPAT_API_FORMAT),
    apiKey: trimRuntimeValue(config?.apiKey) ?? trimRuntimeValue(process.env.OPENAI_API_KEY),
    apiKeyHeaderName,
    apiKeyScheme,
    baseUrl:
      trimRuntimeValue(config?.baseUrl) ??
      trimRuntimeValue(process.env.OPENAI_BASE_URL) ??
      defaults.baseUrl,
    customHeaders: config?.customHeaders ?? getOpenAICompatCustomHeadersFromEnv(),
    disableAuth,
    extraBody: config?.extraBody ?? getOpenAICompatExtraBodyFromEnv(),
    model:
      trimRuntimeValue(config?.model) ?? trimRuntimeValue(process.env.OPENAI_MODEL),
  }
}

export function getOpenAICompatApiKey(
  config?: OpenAICompatRuntimeConfig,
): string | undefined {
  const runtime = resolveOpenAICompatRuntimeConfig(config)
  if (runtime.disableAuth) {
    return undefined
  }
  return runtime.apiKey
}

export function getOpenAICompatBaseUrl(
  config?: OpenAICompatRuntimeConfig,
): string | undefined {
  return resolveOpenAICompatRuntimeConfig(config).baseUrl
}

export function getOpenAICompatProtocol(
  config?: OpenAICompatRuntimeConfig,
): OpenAICompatProtocol {
  const runtime = resolveOpenAICompatRuntimeConfig(config)
  const configured = runtime.apiFormat?.trim().toLowerCase()
  if (
    configured === 'responses' ||
    configured === 'response' ||
    configured === 'openai_responses'
  ) {
    return 'responses'
  }
  if (
    configured === 'chat' ||
    configured === 'chat_completions' ||
    configured === 'chat-completions' ||
    configured === 'completions'
  ) {
    return 'chat_completions'
  }

  try {
    const baseUrl = runtime.baseUrl
    if (!baseUrl) {
      return 'chat_completions'
    }
    const pathname = new URL(baseUrl).pathname.replace(/\/+$/, '').toLowerCase()
    if (pathname.endsWith('/responses')) {
      return 'responses'
    }
  } catch {
    // Fall back to the broader chat/completions family on invalid URLs.
  }

  return 'chat_completions'
}

export function buildOpenAICompatFetch(
  inner: OpenAICompatFetch,
  source: string | undefined,
  config?: OpenAICompatRuntimeConfig,
): OpenAICompatFetch {
  const runtime = resolveOpenAICompatRuntimeConfig(config)

  return async (input, init) => {
    const request = new Request(input, init)
    const requestUrl = new URL(request.url)

    if (
      requestUrl.pathname.endsWith('/v1/messages') ||
      isOpenAICompatDirectMessagesEndpoint(requestUrl, runtime)
    ) {
      return handleMessagesRequest(inner, request, source, runtime)
    }

    if (requestUrl.pathname.endsWith('/v1/messages/count_tokens')) {
      return handleCountTokensRequest(request)
    }

    if (requestUrl.pathname === '/v1/models') {
      return handleModelsListRequest(inner, request, runtime)
    }

    if (requestUrl.pathname.startsWith('/v1/models/')) {
      return handleModelRetrieveRequest(inner, request, runtime)
    }

    return buildAnthropicErrorResponse(
      501,
      `OpenAI-compatible adapter does not support Anthropic endpoint: ${requestUrl.pathname}`,
    )
  }
}

function isOpenAICompatDirectMessagesEndpoint(
  requestUrl: URL,
  runtime: ResolvedOpenAICompatRuntimeConfig,
): boolean {
  try {
    const baseUrl = runtime.baseUrl
    if (!baseUrl) {
      return false
    }

    const configuredUrl = new URL(baseUrl)
    const configuredPath = configuredUrl.pathname.replace(/\/+$/, '') || '/'
    const requestPath = requestUrl.pathname.replace(/\/+$/, '') || '/'

    if (configuredPath !== requestPath) {
      return false
    }

    return (
      configuredPath.endsWith('/chat/completions') ||
      configuredPath.endsWith('/responses')
    )
  } catch {
    return false
  }
}

async function handleMessagesRequest(
  inner: OpenAICompatFetch,
  request: Request,
  source: string | undefined,
  runtime: ResolvedOpenAICompatRuntimeConfig,
): Promise<Response> {
  const requestBody = (await request.json()) as AnthropicMessageRequest
  const protocol = getOpenAICompatProtocol(runtime)
  const endpoint = resolveOpenAICompatEndpoint(
    protocol === 'responses' ? 'responses' : 'chat/completions',
    runtime,
  )
  const headers = buildOpenAIRequestHeaders(
    request.headers,
    requestBody.stream,
    runtime,
  )
  const extraBody = runtime.extraBody
  const openAIRequest =
    protocol === 'responses'
      ? buildOpenAIResponsesRequestBody(requestBody, extraBody)
      : buildOpenAIChatRequestBody(requestBody, extraBody)

  logForDebugging(
    `[API:openai-compat] POST ${endpoint.pathname} protocol=${protocol} source=${source ?? 'unknown'} model=${requestBody.model}`,
  )

  const upstream = await inner(endpoint, {
    body: JSON.stringify(openAIRequest),
    headers,
    method: 'POST',
    signal: request.signal,
  })

  if (!upstream.ok) {
    return buildAnthropicErrorResponseFromUpstream(upstream)
  }

  const requestId = getUpstreamRequestId(upstream.headers)

  if (requestBody.stream) {
    const contentType = upstream.headers.get('content-type') || ''
    if (!contentType.includes('text/event-stream')) {
      const parsed = safeParseJSON(await upstream.text(), false)
      if (!parsed || typeof parsed !== 'object') {
        return buildAnthropicErrorResponse(
          502,
          'OpenAI-compatible adapter received an invalid non-streaming response for a streaming request',
          requestId,
        )
      }

      return protocol === 'responses'
        ? buildAnthropicResponsesStreamResponseFromResponse(
            parsed as OpenAIResponsesResponse,
            requestBody.model,
            requestId,
          )
        : buildAnthropicStreamResponseFromMessage(
            parsed as OpenAIResponse,
            requestBody.model,
            requestId,
          )
    }

    return protocol === 'responses'
      ? buildAnthropicResponsesStreamingResponse(
          upstream,
          requestBody.model,
          requestId,
        )
      : buildAnthropicStreamingResponse(upstream, requestBody.model, requestId)
  }

  const parsed = safeParseJSON(await upstream.text(), false)
  if (!parsed || typeof parsed !== 'object') {
    return buildAnthropicErrorResponse(
      502,
      'OpenAI-compatible adapter received an invalid JSON response',
      requestId,
    )
  }

  const anthropicResponse =
    protocol === 'responses'
      ? openAIResponsesToAnthropicMessage(
          parsed as OpenAIResponsesResponse,
          requestBody.model,
        )
      : openAIResponseToAnthropicMessage(
          parsed as OpenAIResponse,
          requestBody.model,
        )
  return new Response(JSON.stringify(anthropicResponse), {
    headers: buildAnthropicHeaders('application/json', requestId),
    status: 200,
  })
}

async function handleCountTokensRequest(request: Request): Promise<Response> {
  const requestBody = (await request.json()) as AnthropicMessageRequest
  return new Response(
    JSON.stringify({
      context_management: null,
      input_tokens: estimateTokenCount(requestBody),
    }),
    {
      headers: buildAnthropicHeaders('application/json'),
      status: 200,
    },
  )
}

async function handleModelsListRequest(
  inner: OpenAICompatFetch,
  request: Request,
  runtime: ResolvedOpenAICompatRuntimeConfig,
): Promise<Response> {
  if (shouldUseSyntheticModelsResponse(runtime)) {
    return buildSyntheticModelsListResponse(undefined, runtime)
  }

  const endpoint = resolveOpenAICompatEndpoint('models', runtime)
  const upstream = await inner(endpoint, {
    headers: buildOpenAIRequestHeaders(request.headers, false, runtime),
    method: 'GET',
    signal: request.signal,
  })

  if (!upstream.ok) {
    if (shouldFallbackToSyntheticModel(upstream.status)) {
      return buildSyntheticModelsListResponse(
        getUpstreamRequestId(upstream.headers),
        runtime,
      )
    }
    return buildAnthropicErrorResponseFromUpstream(upstream)
  }

  const requestId = getUpstreamRequestId(upstream.headers)
  const parsed = safeParseJSON(await upstream.text(), false)
  const models = Array.isArray((parsed as { data?: unknown[] } | null)?.data)
    ? ((parsed as { data: Array<Record<string, unknown>> }).data ?? [])
    : []
  const data =
    models.length > 0
      ? models.map(model => openAIModelToAnthropicModel(model))
      : buildSyntheticAnthropicModels()

  return new Response(
    JSON.stringify({
      data,
      first_id: data[0]?.id ?? null,
      has_more: false,
      last_id: data.at(-1)?.id ?? null,
    }),
    {
      headers: buildAnthropicHeaders('application/json', requestId),
      status: 200,
    },
  )
}

async function handleModelRetrieveRequest(
  inner: OpenAICompatFetch,
  request: Request,
  runtime: ResolvedOpenAICompatRuntimeConfig,
): Promise<Response> {
  const requestUrl = new URL(request.url)
  const modelId = requestUrl.pathname.split('/').pop()
  if (shouldUseSyntheticModelsResponse(runtime)) {
    return buildSyntheticModelRetrieveResponse(modelId, undefined, runtime)
  }
  const endpoint = resolveOpenAICompatEndpoint(`models/${modelId}`, runtime)
  const upstream = await inner(endpoint, {
    headers: buildOpenAIRequestHeaders(request.headers, false, runtime),
    method: 'GET',
    signal: request.signal,
  })

  if (!upstream.ok) {
    if (shouldFallbackToSyntheticModel(upstream.status)) {
      return buildSyntheticModelRetrieveResponse(
        modelId,
        getUpstreamRequestId(upstream.headers),
        runtime,
      )
    }
    return buildAnthropicErrorResponseFromUpstream(upstream)
  }

  const requestId = getUpstreamRequestId(upstream.headers)
  const parsed = safeParseJSON(await upstream.text(), false)
  const model =
    parsed && typeof parsed === 'object'
      ? openAIModelToAnthropicModel(parsed as Record<string, unknown>)
      : openAIModelToAnthropicModel({})

  return new Response(JSON.stringify(model), {
    headers: buildAnthropicHeaders('application/json', requestId),
    status: 200,
  })
}

function buildOpenAIChatRequestBody(
  requestBody: AnthropicMessageRequest,
  extraBody: Record<string, unknown>,
): Record<string, unknown> {
  const toolChoice = mapToolChoice(requestBody.tool_choice, 'chat_completions')
  const outputConfig = mapOutputConfig(requestBody.output_config)
  const reasoningEffort =
    mapAnthropicEffortToOpenAIReasoningEffort(
      requestBody.output_config?.effort,
      requestBody.model,
    ) ?? mapThinkingToOpenAIReasoningEffort(requestBody.thinking)
  const audioOutputConfig = buildOpenAIChatAudioOutputConfig()
  const prediction = buildOpenAIChatPredictionConfig(
    requestBody,
    audioOutputConfig,
  )
  const frequencyPenalty = getOpenAICompatFrequencyPenalty(
    requestBody,
    prediction,
  )
  const logitBias = getOpenAICompatLogitBias(requestBody)
  const logprobsConfig = getOpenAICompatChatLogprobsConfig()
  const promptCacheKey = getOpenAICompatPromptCacheKey()
  const promptCacheRetention = getOpenAICompatPromptCacheRetention()
  const parallelToolCalls = getOpenAICompatParallelToolCalls(requestBody)
  const presencePenalty = getOpenAICompatPresencePenalty(
    requestBody,
    prediction,
  )
  const seed = getOpenAICompatSeed(requestBody)
  const serviceTier = getOpenAICompatServiceTier()
  const temperature = getOpenAICompatTemperature(requestBody)
  const topP = getOpenAICompatTopP(requestBody)
  const verbosity = getOpenAICompatVerbosity()

  return {
    max_tokens: requestBody.max_tokens,
    messages: anthropicMessagesToOpenAI(requestBody),
    model: requestBody.model,
    stream: requestBody.stream === true,
    ...(temperature !== undefined && { temperature }),
    ...(seed !== undefined && { seed }),
    ...(topP !== undefined && { top_p: topP }),
    ...(logitBias && { logit_bias: logitBias }),
    ...(logprobsConfig.logprobs !== undefined && {
      logprobs: logprobsConfig.logprobs,
    }),
    ...(logprobsConfig.topLogprobs !== undefined && {
      top_logprobs: logprobsConfig.topLogprobs,
    }),
    ...(frequencyPenalty !== undefined && {
      frequency_penalty: frequencyPenalty,
    }),
    ...(presencePenalty !== undefined && {
      presence_penalty: presencePenalty,
    }),
    ...(requestBody.stop_sequences &&
      requestBody.stop_sequences.length > 0 && {
        stop: requestBody.stop_sequences,
      }),
    ...(requestBody.tools &&
      requestBody.tools.length > 0 && {
        tools: anthropicToolsToOpenAI(requestBody.tools),
      }),
    ...(toolChoice !== undefined && { tool_choice: toolChoice }),
    ...(parallelToolCalls !== undefined && {
      parallel_tool_calls: parallelToolCalls,
    }),
    ...(outputConfig && { response_format: outputConfig }),
    ...(reasoningEffort && { reasoning_effort: reasoningEffort }),
    ...audioOutputConfig,
    ...(prediction && { prediction }),
    ...(promptCacheKey && { prompt_cache_key: promptCacheKey }),
    ...(promptCacheRetention && {
      prompt_cache_retention: promptCacheRetention,
    }),
    ...(serviceTier && { service_tier: serviceTier }),
    ...(verbosity && { verbosity }),
    ...extraBody,
  }
}

function buildOpenAIResponsesRequestBody(
  requestBody: AnthropicMessageRequest,
  extraBody: Record<string, unknown>,
): Record<string, unknown> {
  const toolChoice = mapToolChoice(requestBody.tool_choice, 'responses')
  const textConfig = buildOpenAIResponsesTextConfig(requestBody.output_config)
  const reasoningConfig = buildOpenAIResponsesReasoningConfig(
    requestBody.thinking,
    requestBody.output_config?.effort,
    requestBody.model,
  )
  const promptCacheKey = getOpenAICompatPromptCacheKey()
  const promptCacheRetention = getOpenAICompatPromptCacheRetention()
  const parallelToolCalls = getOpenAICompatParallelToolCalls(requestBody)
  const seed = getOpenAICompatSeed(requestBody)
  const serviceTier = getOpenAICompatServiceTier()
  const temperature = getOpenAICompatTemperature(requestBody)
  const topP = getOpenAICompatTopP(requestBody)
  const truncation = getOpenAICompatTruncation()
  const systemText = normalizeSystemPrompt(requestBody.system)

  return {
    input: anthropicMessagesToOpenAIResponsesInput(requestBody),
    max_output_tokens: requestBody.max_tokens,
    model: requestBody.model,
    stream: requestBody.stream === true,
    ...(systemText && {
      instructions: systemText,
    }),
    ...(temperature !== undefined && { temperature }),
    ...(seed !== undefined && { seed }),
    ...(topP !== undefined && { top_p: topP }),
    ...(requestBody.tools &&
      requestBody.tools.length > 0 && {
        tools: anthropicToolsToResponses(requestBody.tools),
      }),
    ...(toolChoice !== undefined && { tool_choice: toolChoice }),
    ...(parallelToolCalls !== undefined && {
      parallel_tool_calls: parallelToolCalls,
    }),
    ...(textConfig && { text: textConfig }),
    ...(promptCacheKey && { prompt_cache_key: promptCacheKey }),
    ...(promptCacheRetention && {
      prompt_cache_retention: promptCacheRetention,
    }),
    ...(serviceTier && { service_tier: serviceTier }),
    ...(reasoningConfig && { reasoning: reasoningConfig }),
    ...(truncation && { truncation }),
    ...extraBody,
  }
}

function anthropicMessagesToOpenAI(
  requestBody: AnthropicMessageRequest,
): OpenAIRequestMessage[] {
  const messages: OpenAIRequestMessage[] = []
  const systemText = normalizeSystemPrompt(requestBody.system)

  if (systemText) {
    messages.push({
      content: systemText,
      role: 'system',
    })
  }

  for (const message of requestBody.messages) {
    if (typeof message.content === 'string') {
      if (message.content) {
        messages.push({
          content: message.content,
          role: message.role,
        })
      }
      continue
    }

    if (!Array.isArray(message.content)) {
      continue
    }

    if (message.role === 'assistant') {
      const assistantText: string[] = []
      const toolCalls: NonNullable<OpenAIRequestMessage['tool_calls']> = []

      for (const block of message.content) {
        if (!block || typeof block !== 'object') {
          continue
        }
        const type = block.type
        if (type === 'text' && typeof block.text === 'string') {
          assistantText.push(block.text)
          continue
        }
        if (
          (type === 'tool_use' ||
            type === 'mcp_tool_use' ||
            type === 'server_tool_use') &&
          typeof block.name === 'string'
        ) {
          toolCalls.push({
            function: {
              arguments: JSON.stringify(block.input ?? {}),
              name: block.name,
            },
            id:
              typeof block.id === 'string' && block.id
                ? block.id
                : `call_${randomUUID().replaceAll('-', '')}`,
            type: 'function',
          })
          continue
        }

        const text = blockToText(block)
        if (text) {
          assistantText.push(text)
        }
      }

      if (assistantText.length > 0 || toolCalls.length > 0) {
        messages.push({
          content: assistantText.length > 0 ? assistantText.join('\n\n') : null,
          role: 'assistant',
          ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
        })
      }
      continue
    }

    const pendingUserContentParts: Array<Record<string, unknown>> = []
    const flushPendingUserContentParts = () => {
      const content = collapseOpenAIChatContentParts(pendingUserContentParts)
      if (content) {
        messages.push({
          content,
          role: 'user',
        })
      }
      pendingUserContentParts.length = 0
    }

    for (const block of message.content) {
      if (!block || typeof block !== 'object') {
        continue
      }

      const contentPart = anthropicBlockToOpenAIChatContentPart(block)
      if (contentPart) {
        pendingUserContentParts.push(contentPart)
        continue
      }

      if (block.type === 'tool_result') {
        flushPendingUserContentParts()
        messages.push({
          content: toolResultContentToString(block),
          role: 'tool',
          tool_call_id:
            typeof block.tool_use_id === 'string' && block.tool_use_id
              ? block.tool_use_id
              : `call_${randomUUID().replaceAll('-', '')}`,
        })
        continue
      }

      const text = blockToText(block)
      if (text) {
        pendingUserContentParts.push({
          text,
          type: 'text',
        })
      }
    }

    flushPendingUserContentParts()
  }

  return messages
}

function anthropicMessagesToOpenAIResponsesInput(
  requestBody: AnthropicMessageRequest,
): Array<Record<string, unknown>> {
  const input: Array<Record<string, unknown>> = []

  for (const message of requestBody.messages) {
    if (typeof message.content === 'string') {
      const text = message.content.trim()
      if (text) {
        input.push(buildResponsesTextMessage(message.role, text))
      }
      continue
    }

    if (!Array.isArray(message.content)) {
      continue
    }

    if (message.role === 'assistant') {
      const pendingAssistantText: string[] = []
      const flushAssistantText = () => {
        const text = pendingAssistantText.join('\n\n').trim()
        if (text) {
          input.push(buildResponsesAssistantMessage(text))
        }
        pendingAssistantText.length = 0
      }

      for (const block of message.content) {
        if (!block || typeof block !== 'object') {
          continue
        }
        const type = block.type
        if (type === 'text' && typeof block.text === 'string') {
          pendingAssistantText.push(block.text)
          continue
        }
        if (
          (type === 'tool_use' ||
            type === 'mcp_tool_use' ||
            type === 'server_tool_use') &&
          typeof block.name === 'string'
        ) {
          flushAssistantText()
          input.push({
            arguments: JSON.stringify(block.input ?? {}),
            call_id:
              typeof block.id === 'string' && block.id
                ? block.id
                : `call_${randomUUID().replaceAll('-', '')}`,
            name: block.name,
            status: 'completed',
            type: 'function_call',
          })
          continue
        }

        const text = blockToText(block)
        if (text) {
          pendingAssistantText.push(text)
        }
      }

      flushAssistantText()
      continue
    }

    const pendingUserContentParts: Array<Record<string, unknown>> = []
    const flushPendingUserContentParts = () => {
      if (pendingUserContentParts.length > 0) {
        input.push(buildResponsesUserMessage(pendingUserContentParts))
      }
      pendingUserContentParts.length = 0
    }

    for (const block of message.content) {
      if (!block || typeof block !== 'object') {
        continue
      }

      const contentPart = anthropicBlockToOpenAIResponsesContentPart(block)
      if (contentPart) {
        pendingUserContentParts.push(contentPart)
        continue
      }

      if (block.type === 'tool_result') {
        flushPendingUserContentParts()
        input.push({
          call_id:
            typeof block.tool_use_id === 'string' && block.tool_use_id
              ? block.tool_use_id
              : `call_${randomUUID().replaceAll('-', '')}`,
          output: toolResultContentToString(block),
          type: 'function_call_output',
        })
        continue
      }

      const text = blockToText(block)
      if (text) {
        pendingUserContentParts.push({
          text,
          type: 'input_text',
        })
      }
    }

    flushPendingUserContentParts()
  }

  return input
}

function buildResponsesTextMessage(
  role: 'assistant' | 'user',
  text: string,
): Record<string, unknown> {
  return role === 'assistant'
    ? buildResponsesAssistantMessage(text)
    : {
        content: [
          {
            text,
            type: 'input_text',
          },
        ],
        role: 'user',
        type: 'message',
      }
}

function buildResponsesAssistantMessage(text: string): Record<string, unknown> {
  return {
    content: [
      {
        annotations: [],
        text,
        type: 'output_text',
      },
    ],
    role: 'assistant',
    status: 'completed',
    type: 'message',
  }
}

function buildResponsesUserMessage(
  content: Array<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    content: mergeAdjacentContentParts(content),
    role: 'user',
    type: 'message',
  }
}

function anthropicToolsToOpenAI(
  tools: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const converted: Array<Record<string, unknown>> = []

  for (const tool of tools) {
    if (typeof tool.name !== 'string') {
      continue
    }

    const parameters =
      tool.input_schema &&
      typeof tool.input_schema === 'object' &&
      !Array.isArray(tool.input_schema)
        ? tool.input_schema
        : { properties: {}, type: 'object' }

    converted.push({
      function: {
        ...(typeof tool.description === 'string' && {
          description: tool.description,
        }),
        name: tool.name,
        parameters,
      },
      type: 'function',
    })
  }

  return converted
}

function anthropicToolsToResponses(
  tools: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const converted: Array<Record<string, unknown>> = []

  for (const tool of tools) {
    if (typeof tool.name !== 'string') {
      continue
    }

    const parameters =
      tool.input_schema &&
      typeof tool.input_schema === 'object' &&
      !Array.isArray(tool.input_schema)
        ? tool.input_schema
        : { properties: {}, type: 'object' }

    converted.push({
      ...(typeof tool.description === 'string' && {
        description: tool.description,
      }),
      name: tool.name,
      parameters,
      type: 'function',
    })
  }

  return converted
}

function mapToolChoice(
  toolChoice: AnthropicMessageRequest['tool_choice'],
  protocol: OpenAICompatProtocol,
): Record<string, unknown> | string | undefined {
  if (!toolChoice || typeof toolChoice !== 'object') {
    return undefined
  }

  switch (toolChoice.type) {
    case 'any':
      return 'required'
    case 'none':
      return 'none'
    case 'tool':
      return typeof toolChoice.name === 'string'
        ? protocol === 'responses'
          ? {
              name: toolChoice.name,
              type: 'function',
            }
          : {
              function: { name: toolChoice.name },
              type: 'function',
            }
        : 'required'
    case 'auto':
    default:
      return 'auto'
  }
}

function mapOutputConfig(
  outputConfig: AnthropicMessageRequest['output_config'],
): Record<string, unknown> | undefined {
  if (
    outputConfig?.format?.type !== 'json_schema' ||
    !outputConfig.format.schema ||
    typeof outputConfig.format.schema !== 'object'
  ) {
    return undefined
  }

  return {
    json_schema: {
      name: 'claude_code_output',
      schema: outputConfig.format.schema,
    },
    type: 'json_schema',
  }
}

function mapResponsesOutputConfig(
  outputConfig: AnthropicMessageRequest['output_config'],
): Record<string, unknown> | undefined {
  if (
    outputConfig?.format?.type !== 'json_schema' ||
    !outputConfig.format.schema ||
    typeof outputConfig.format.schema !== 'object'
  ) {
    return undefined
  }

  return {
    format: {
      name: 'claude_code_output',
      schema: outputConfig.format.schema,
      type: 'json_schema',
    },
  }
}

function buildOpenAIResponsesTextConfig(
  outputConfig: AnthropicMessageRequest['output_config'],
): Record<string, unknown> | undefined {
  const formatConfig = mapResponsesOutputConfig(outputConfig)
  const verbosity = getOpenAICompatVerbosity()

  if (!formatConfig && !verbosity) {
    return undefined
  }

  return {
    ...(formatConfig ?? {}),
    ...(verbosity && { verbosity }),
  }
}

function mapThinkingToOpenAIReasoningEffort(
  thinking: AnthropicMessageRequest['thinking'],
): OpenAICompatReasoningEffort | undefined {
  const configuredOverride = getOpenAICompatReasoningEffortOverride()
  if (configuredOverride) {
    return configuredOverride
  }

  if (!thinking || typeof thinking !== 'object') {
    return undefined
  }

  if (thinking.type === 'adaptive') {
    return 'medium'
  }

  const budgetTokens =
    typeof thinking.budget_tokens === 'number' &&
    Number.isFinite(thinking.budget_tokens)
      ? thinking.budget_tokens
      : undefined

  if (budgetTokens === undefined) {
    return undefined
  }

  if (budgetTokens <= 1_024) {
    return 'minimal'
  }
  if (budgetTokens <= 4_096) {
    return 'low'
  }
  if (budgetTokens <= 16_384) {
    return 'medium'
  }

  return 'high'
}

function mapAnthropicEffortToOpenAIReasoningEffort(
  effort: AnthropicOutputEffort,
  model: string,
): OpenAICompatReasoningEffort | undefined {
  switch (effort) {
    case 'low':
    case 'medium':
    case 'high':
      return effort
    case 'max':
      return modelUsesXHighEffortLabel(model) ? 'xhigh' : 'high'
    default:
      return undefined
  }
}

function getOpenAICompatReasoningEffortOverride():
  | OpenAICompatReasoningEffort
  | undefined {
  const configured = process.env.OPENAI_COMPAT_REASONING_EFFORT?.trim()
  if (!configured) {
    return undefined
  }

  switch (configured.toLowerCase()) {
    case 'none':
    case 'minimal':
    case 'low':
    case 'medium':
    case 'high':
    case 'xhigh':
      return configured.toLowerCase() as OpenAICompatReasoningEffort
    default:
      return undefined
  }
}

function buildOpenAIResponsesReasoningConfig(
  thinking: AnthropicMessageRequest['thinking'],
  effort: AnthropicOutputEffort,
  model: string,
): Record<string, unknown> | undefined {
  const resolvedEffort =
    mapAnthropicEffortToOpenAIReasoningEffort(effort, model) ??
    mapThinkingToOpenAIReasoningEffort(thinking)
  const summary = getOpenAICompatReasoningSummary()

  if (!resolvedEffort && !summary) {
    return undefined
  }

  return {
    ...(resolvedEffort && { effort: resolvedEffort }),
    ...(summary && { summary }),
  }
}

function getOpenAICompatReasoningSummary():
  | OpenAICompatReasoningSummary
  | undefined {
  const configured = process.env.OPENAI_COMPAT_REASONING_SUMMARY?.trim()
  if (!configured) {
    return undefined
  }

  switch (configured.toLowerCase()) {
    case 'auto':
    case 'concise':
    case 'detailed':
      return configured.toLowerCase() as OpenAICompatReasoningSummary
    default:
      return undefined
  }
}

function buildOpenAIChatAudioOutputConfig(): Record<string, unknown> {
  const modalities = getOpenAICompatChatModalities()
  const audioConfig = getOpenAICompatChatAudioConfig()

  if (!modalities) {
    if (!audioConfig) {
      return {}
    }

    return {
      audio: audioConfig,
      modalities: ['text', 'audio'],
    }
  }

  const wantsAudio = modalities.includes('audio')
  if (!wantsAudio) {
    return {
      modalities,
    }
  }

  if (!audioConfig) {
    const filteredModalities = modalities.filter(
      modality => modality !== 'audio',
    )
    logForDebugging(
      '[API:openai-compat] OPENAI_COMPAT_MODALITIES requested audio, but OPENAI_COMPAT_AUDIO_FORMAT/VOICE is incomplete; dropping audio modality',
    )

    return filteredModalities.length > 0
      ? { modalities: filteredModalities }
      : {}
  }

  return {
    audio: audioConfig,
    modalities,
  }
}

function buildOpenAIChatPredictionConfig(
  requestBody: AnthropicMessageRequest,
  audioOutputConfig: Record<string, unknown>,
): OpenAICompatPrediction | undefined {
  const content = getOpenAICompatPredictionContent()
  if (!content) {
    return undefined
  }

  if (Array.isArray(requestBody.tools) && requestBody.tools.length > 0) {
    logForDebugging(
      '[API:openai-compat] OPENAI_COMPAT_PREDICTION_CONTENT requested, but chat request includes tools; dropping prediction',
    )
    return undefined
  }

  if (chatRequestHasAudioOutput(audioOutputConfig)) {
    logForDebugging(
      '[API:openai-compat] OPENAI_COMPAT_PREDICTION_CONTENT requested, but chat request includes audio output; dropping prediction',
    )
    return undefined
  }

  return {
    content,
    type: 'content',
  }
}

function chatRequestHasAudioOutput(
  audioOutputConfig: Record<string, unknown>,
): boolean {
  if ('audio' in audioOutputConfig) {
    return true
  }

  const modalities = audioOutputConfig.modalities
  return (
    Array.isArray(modalities) && modalities.some(modality => modality === 'audio')
  )
}

function getOpenAICompatServiceTier(): OpenAICompatServiceTier | undefined {
  const configured = process.env.OPENAI_COMPAT_SERVICE_TIER?.trim()
  if (!configured) {
    return undefined
  }

  switch (configured.toLowerCase()) {
    case 'auto':
    case 'default':
    case 'flex':
    case 'priority':
      return configured.toLowerCase() as OpenAICompatServiceTier
    case 'standard':
      return 'default'
    default:
      return undefined
  }
}

function getOpenAICompatTruncation(): OpenAICompatTruncation | undefined {
  const configured = process.env.OPENAI_COMPAT_TRUNCATION?.trim()
  if (!configured) {
    return undefined
  }

  switch (configured.toLowerCase()) {
    case 'auto':
    case 'disabled':
      return configured.toLowerCase() as OpenAICompatTruncation
    default:
      return undefined
  }
}

function getOpenAICompatChatModalities():
  | OpenAICompatChatModality[]
  | undefined {
  const configured = process.env.OPENAI_COMPAT_MODALITIES?.trim()
  if (!configured) {
    return undefined
  }

  const modalities = configured
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(
      (value): value is OpenAICompatChatModality =>
        value === 'audio' || value === 'text',
    )

  if (modalities.length === 0) {
    return undefined
  }

  return [...new Set(modalities)]
}

function getOpenAICompatChatAudioConfig(): Record<string, unknown> | undefined {
  const format = getOpenAICompatAudioFormat()
  const voice = process.env.OPENAI_COMPAT_AUDIO_VOICE?.trim()

  if (!format || !voice) {
    return undefined
  }

  return {
    format,
    voice,
  }
}

function getOpenAICompatAudioFormat(): OpenAICompatAudioFormat | undefined {
  const configured = process.env.OPENAI_COMPAT_AUDIO_FORMAT?.trim()
  if (!configured) {
    return undefined
  }

  switch (configured.toLowerCase()) {
    case 'flac':
    case 'mp3':
    case 'opus':
    case 'pcm16':
    case 'wav':
      return configured.toLowerCase() as OpenAICompatAudioFormat
    default:
      return undefined
  }
}

function getOpenAICompatVerbosity(): OpenAICompatVerbosity | undefined {
  const configured = process.env.OPENAI_COMPAT_VERBOSITY?.trim()
  if (!configured) {
    return undefined
  }

  switch (configured.toLowerCase()) {
    case 'low':
    case 'medium':
    case 'high':
      return configured.toLowerCase() as OpenAICompatVerbosity
    default:
      return undefined
  }
}

function getOpenAICompatTopP(
  requestBody: AnthropicMessageRequest,
): number | undefined {
  return (
    normalizeOpenAICompatTopP(process.env.OPENAI_COMPAT_TOP_P) ??
    normalizeOpenAICompatTopP(requestBody.top_p)
  )
}

function normalizeOpenAICompatTopP(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 && value <= 1
      ? value
      : undefined
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : undefined
}

function getOpenAICompatTemperature(
  requestBody: AnthropicMessageRequest,
): number | undefined {
  return (
    normalizeOpenAICompatTemperature(process.env.OPENAI_COMPAT_TEMPERATURE) ??
    normalizeOpenAICompatTemperature(requestBody.temperature)
  )
}

function normalizeOpenAICompatTemperature(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getOpenAICompatFrequencyPenalty(
  requestBody: AnthropicMessageRequest,
  prediction: OpenAICompatPrediction | undefined,
): number | undefined {
  const penalty =
    normalizeOpenAICompatPenalty(process.env.OPENAI_COMPAT_FREQUENCY_PENALTY) ??
    normalizeOpenAICompatPenalty(requestBody.frequency_penalty)

  return maybeDropOpenAICompatPenaltyForPrediction(
    'frequency_penalty',
    penalty,
    prediction,
  )
}

function getOpenAICompatPresencePenalty(
  requestBody: AnthropicMessageRequest,
  prediction: OpenAICompatPrediction | undefined,
): number | undefined {
  const penalty =
    normalizeOpenAICompatPenalty(process.env.OPENAI_COMPAT_PRESENCE_PENALTY) ??
    normalizeOpenAICompatPenalty(requestBody.presence_penalty)

  return maybeDropOpenAICompatPenaltyForPrediction(
    'presence_penalty',
    penalty,
    prediction,
  )
}

function normalizeOpenAICompatPenalty(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= -2 && value <= 2
      ? value
      : undefined
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed >= -2 && parsed <= 2
    ? parsed
    : undefined
}

function maybeDropOpenAICompatPenaltyForPrediction(
  kind: OpenAICompatPenaltyKind,
  value: number | undefined,
  prediction: OpenAICompatPrediction | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (prediction && value > 0) {
    logForDebugging(
      `[API:openai-compat] ${kind} > 0 is not supported with prediction; dropping ${kind}`,
    )
    return undefined
  }

  return value
}

function getOpenAICompatLogitBias(
  requestBody: AnthropicMessageRequest,
): Record<string, number> | undefined {
  return (
    normalizeOpenAICompatLogitBias(process.env.OPENAI_COMPAT_LOGIT_BIAS) ??
    normalizeOpenAICompatLogitBias(requestBody.logit_bias)
  )
}

function normalizeOpenAICompatLogitBias(
  value: unknown,
): Record<string, number> | undefined {
  let candidate: unknown = value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return undefined
    }
    candidate = safeParseJSON(trimmed, false)
  }

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return undefined
  }

  const normalized = Object.fromEntries(
    Object.entries(candidate).filter((entry): entry is [string, number] => {
      const [tokenId, bias] = entry
      return (
        /^\d+$/.test(tokenId) &&
        typeof bias === 'number' &&
        Number.isFinite(bias) &&
        bias >= -100 &&
        bias <= 100
      )
    }),
  )

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function getOpenAICompatChatLogprobsConfig(): OpenAICompatChatLogprobsConfig {
  const logprobs = normalizeOpenAICompatBoolean(process.env.OPENAI_COMPAT_LOGPROBS)
  const topLogprobs = normalizeOpenAICompatTopLogprobs(
    process.env.OPENAI_COMPAT_TOP_LOGPROBS,
  )

  if (topLogprobs === undefined) {
    return logprobs === undefined ? {} : { logprobs }
  }

  if (logprobs === false) {
    logForDebugging(
      '[API:openai-compat] OPENAI_COMPAT_TOP_LOGPROBS requested, but OPENAI_COMPAT_LOGPROBS=false; dropping top_logprobs',
    )
    return { logprobs: false }
  }

  return {
    logprobs: true,
    topLogprobs,
  }
}

function normalizeOpenAICompatBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  switch (trimmed.toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false
    default:
      return undefined
  }
}

function normalizeOpenAICompatTopLogprobs(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 20
      ? value
      : undefined
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 20
    ? parsed
    : undefined
}

function getOpenAICompatParallelToolCalls(
  requestBody: AnthropicMessageRequest,
): boolean | undefined {
  if (
    requestBody.tool_choice &&
    typeof requestBody.tool_choice === 'object' &&
    requestBody.tool_choice.disable_parallel_tool_use === true
  ) {
    return false
  }

  const configured = process.env.OPENAI_COMPAT_PARALLEL_TOOL_CALLS?.trim()
  return normalizeOpenAICompatBoolean(configured)
}

function getOpenAICompatSeed(
  requestBody: AnthropicMessageRequest,
): number | undefined {
  return (
    normalizeOpenAICompatSeed(process.env.OPENAI_COMPAT_SEED) ??
    normalizeOpenAICompatSeed(requestBody.seed)
  )
}

function normalizeOpenAICompatSeed(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : undefined
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function getOpenAICompatPredictionContent(): string | undefined {
  const configured = process.env.OPENAI_COMPAT_PREDICTION_CONTENT
  if (!configured || configured.trim().length === 0) {
    return undefined
  }

  return configured
}

function getOpenAICompatPromptCacheKey(): string | undefined {
  const configured = process.env.OPENAI_COMPAT_PROMPT_CACHE_KEY
  if (!configured || configured.trim().length === 0) {
    return undefined
  }

  return configured
}

function getOpenAICompatPromptCacheRetention():
  | OpenAICompatPromptCacheRetention
  | undefined {
  const configured = process.env.OPENAI_COMPAT_PROMPT_CACHE_RETENTION?.trim()
  if (!configured) {
    return undefined
  }

  switch (configured.toLowerCase()) {
    case '24h':
      return '24h'
    case 'in_memory':
    case 'in-memory':
      return 'in_memory'
    default:
      return undefined
  }
}

function normalizeSystemPrompt(
  system: AnthropicMessageRequest['system'],
): string {
  if (typeof system === 'string') {
    return system
  }

  if (!Array.isArray(system)) {
    return ''
  }

  return system
    .map(block => block.text?.trim() || '')
    .filter(Boolean)
    .join('\n\n')
}

function anthropicBlockToOpenAIChatContentPart(
  block: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (block.type === 'text' && typeof block.text === 'string') {
    return {
      text: block.text,
      type: 'text',
    }
  }

  const imageDataUrl = getBase64DataUrlFromBlock(block, 'image')
  if (imageDataUrl) {
    return {
      image_url: {
        url: imageDataUrl,
      },
      type: 'image_url',
    }
  }

  const fileData = getOpenAIFileDataFromDocumentBlock(block)
  if (fileData) {
    return {
      file: fileData,
      type: 'file',
    }
  }

  return undefined
}

function anthropicBlockToOpenAIResponsesContentPart(
  block: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (block.type === 'text' && typeof block.text === 'string') {
    return {
      text: block.text,
      type: 'input_text',
    }
  }

  const imageDataUrl = getBase64DataUrlFromBlock(block, 'image')
  if (imageDataUrl) {
    return {
      image_url: imageDataUrl,
      type: 'input_image',
    }
  }

  const fileData = getOpenAIFileDataFromDocumentBlock(block)
  if (fileData) {
    return {
      ...fileData,
      type: 'input_file',
    }
  }

  return undefined
}

function getBase64DataUrlFromBlock(
  block: Record<string, unknown>,
  expectedType: 'document' | 'image',
): string | undefined {
  if (block.type !== expectedType) {
    return undefined
  }

  const source =
    block.source && typeof block.source === 'object'
      ? (block.source as Record<string, unknown>)
      : undefined
  if (!source || source.type !== 'base64' || typeof source.data !== 'string') {
    return undefined
  }

  const mediaType =
    typeof source.media_type === 'string' && source.media_type
      ? source.media_type
      : expectedType === 'image'
        ? 'image/png'
        : 'application/octet-stream'

  return `data:${mediaType};base64,${source.data}`
}

function getOpenAIFileDataFromDocumentBlock(
  block: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const fileData = getBase64DataUrlFromBlock(block, 'document')
  if (!fileData) {
    return undefined
  }

  const source =
    block.source && typeof block.source === 'object'
      ? (block.source as Record<string, unknown>)
      : undefined
  const mediaType =
    typeof source?.media_type === 'string' && source.media_type
      ? source.media_type
      : 'application/octet-stream'

  return {
    file_data: fileData,
    filename: getOpenAICompatDocumentFilename(block, mediaType),
  }
}

function getOpenAICompatDocumentFilename(
  block: Record<string, unknown>,
  mediaType: string,
): string {
  if (typeof block.filename === 'string' && block.filename.trim()) {
    return block.filename.trim()
  }
  if (typeof block.title === 'string' && block.title.trim()) {
    return block.title.trim()
  }

  switch (mediaType) {
    case 'application/pdf':
      return 'document.pdf'
    case 'text/plain':
      return 'document.txt'
    default:
      return 'document'
  }
}

function collapseOpenAIChatContentParts(
  parts: Array<Record<string, unknown>>,
): string | Array<Record<string, unknown>> | undefined {
  const normalized = mergeAdjacentContentParts(parts)
  if (normalized.length === 0) {
    return undefined
  }
  if (
    normalized.every(
      part => part.type === 'text' && typeof part.text === 'string',
    )
  ) {
    const text = normalized
      .map(part => (typeof part.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n\n')
      .trim()
    return text || undefined
  }
  return normalized
}

function mergeAdjacentContentParts(
  parts: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const merged: Array<Record<string, unknown>> = []

  for (const part of parts) {
    if (!part || typeof part !== 'object') {
      continue
    }

    const text =
      typeof part.text === 'string' &&
      (part.type === 'text' || part.type === 'input_text')
        ? part.text
        : undefined

    if (text === undefined) {
      merged.push(part)
      continue
    }

    const previous = merged.at(-1)
    if (
      previous &&
      previous.type === part.type &&
      typeof previous.text === 'string'
    ) {
      previous.text = `${previous.text}\n\n${text}`
      continue
    }

    merged.push({ ...part })
  }

  return merged
}

function blockToText(block: Record<string, unknown>): string {
  switch (block.type) {
    case 'text':
      return typeof block.text === 'string' ? block.text : ''
    case 'thinking':
      return typeof block.thinking === 'string' ? block.thinking : ''
    case 'document':
      return '[Document content omitted by OpenAI-compatible adapter]'
    case 'image':
      return '[Image content omitted by OpenAI-compatible adapter]'
    case 'search_result':
      return '[Search result content omitted by OpenAI-compatible adapter]'
    default:
      return ''
  }
}

function toolResultContentToString(block: Record<string, unknown>): string {
  const prefix = block.is_error === true ? 'Tool error:\n' : ''
  const content = block.content

  if (typeof content === 'string') {
    return `${prefix}${content}`.trim()
  }

  if (Array.isArray(content)) {
    const rendered = content
      .map(item =>
        item && typeof item === 'object'
          ? blockToText(item as Record<string, unknown>)
          : '',
      )
      .filter(Boolean)
      .join('\n\n')
    return `${prefix}${rendered || '(empty tool result)'}`.trim()
  }

  return `${prefix}(empty tool result)`.trim()
}

function openAIResponseToAnthropicMessage(
  response: OpenAIResponse,
  fallbackModel: string,
): Record<string, unknown> {
  const choice = response.choices?.[0]
  const message = choice?.message
  const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : []
  const content = collectOpenAIMessageText(message?.content)
  const blocks: Array<Record<string, unknown>> = []

  if (content) {
    blocks.push({
      citations: null,
      text: content,
      type: 'text',
    })
  }

  for (const toolCall of toolCalls) {
    blocks.push({
      id:
        typeof toolCall.id === 'string' && toolCall.id
          ? toolCall.id
          : `call_${randomUUID().replaceAll('-', '')}`,
      input: parseToolArguments(toolCall.function?.arguments),
      name: toolCall.function?.name || 'tool',
      type: 'tool_use',
    })
  }

  return {
    container: null,
    content: blocks,
    context_management: null,
    id:
      typeof response.id === 'string' && response.id
        ? response.id
        : `msg_${randomUUID().replaceAll('-', '')}`,
    model:
      typeof response.model === 'string' && response.model
        ? response.model
        : fallbackModel,
    role: 'assistant',
    stop_reason: mapFinishReason(choice?.finish_reason, toolCalls.length > 0),
    stop_sequence: null,
    type: 'message',
    usage: createAnthropicUsage(response.usage),
  }
}

function openAIResponsesToAnthropicMessage(
  response: OpenAIResponsesResponse,
  fallbackModel: string,
): Record<string, unknown> {
  const blocks: Array<Record<string, unknown>> = []
  let hasToolCalls = false

  const output = Array.isArray(response.output) ? response.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue
    }

    if (item.type === 'message') {
      const content = collectOpenAIResponsesMessageText(item.content)
      if (content) {
        blocks.push({
          citations: null,
          text: content,
          type: 'text',
        })
      }
      continue
    }

    if (item.type === 'function_call') {
      hasToolCalls = true
      blocks.push({
        id:
          (typeof item.call_id === 'string' && item.call_id) ||
          (typeof item.id === 'string' && item.id) ||
          `call_${randomUUID().replaceAll('-', '')}`,
        input: parseToolArguments(item.arguments),
        name:
          typeof item.name === 'string' && item.name ? item.name : 'tool',
        type: 'tool_use',
      })
    }
  }

  if (blocks.length === 0 && typeof response.output_text === 'string') {
    blocks.push({
      citations: null,
      text: response.output_text,
      type: 'text',
    })
  }

  return {
    container: null,
    content: blocks,
    context_management: null,
    id:
      typeof response.id === 'string' && response.id
        ? response.id
        : `msg_${randomUUID().replaceAll('-', '')}`,
    model:
      typeof response.model === 'string' && response.model
        ? response.model
        : fallbackModel,
    role: 'assistant',
    stop_reason: mapFinishReason(
      response.incomplete_details?.reason,
      hasToolCalls,
    ),
    stop_sequence: null,
    type: 'message',
    usage: createAnthropicUsage(response.usage),
  }
}

function collectOpenAIMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map(item => {
      if (typeof item === 'string') {
        return item
      }
      if (!item || typeof item !== 'object') {
        return ''
      }
      if (typeof item.text === 'string') {
        return item.text
      }
      if (
        item.text &&
        typeof item.text === 'object' &&
        'value' in item.text &&
        typeof item.text.value === 'string'
      ) {
        return item.text.value
      }
      return ''
    })
    .filter(Boolean)
    .join('')
}

function collectOpenAIResponsesMessageText(content: unknown): string {
  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map(item => {
      if (!item || typeof item !== 'object') {
        return ''
      }
      if (item.type === 'output_text' && typeof item.text === 'string') {
        return item.text
      }
      if (item.type === 'refusal' && typeof item.refusal === 'string') {
        return item.refusal
      }
      return ''
    })
    .filter(Boolean)
    .join('')
}

function parseToolArguments(argumentsText: unknown): unknown {
  if (typeof argumentsText !== 'string') {
    return argumentsText ?? {}
  }

  const parsed = safeParseJSON(argumentsText, false)
  return parsed ?? argumentsText
}

function createAnthropicUsage(usage: OpenAIUsage | undefined) {
  return {
    ...EMPTY_ANTHROPIC_USAGE,
    input_tokens: usage?.prompt_tokens ?? usage?.input_tokens ?? 0,
    output_tokens: usage?.completion_tokens ?? usage?.output_tokens ?? 0,
  }
}

function createAnthropicDeltaUsage(usage: OpenAIUsage | undefined) {
  return {
    ...EMPTY_ANTHROPIC_DELTA_USAGE,
    input_tokens: usage?.prompt_tokens ?? usage?.input_tokens ?? 0,
    output_tokens: usage?.completion_tokens ?? usage?.output_tokens ?? 0,
  }
}

function mapFinishReason(
  finishReason: string | null | undefined,
  hasToolCalls: boolean,
): string {
  if (
    finishReason === 'tool_calls' ||
    finishReason === 'function_call' ||
    (!finishReason && hasToolCalls)
  ) {
    return 'tool_use'
  }
  if (finishReason === 'length' || finishReason === 'max_output_tokens') {
    return 'max_tokens'
  }
  if (finishReason === 'content_filter') {
    return 'refusal'
  }
  return 'end_turn'
}

function estimateTokenCount(requestBody: AnthropicMessageRequest): number {
  const serialized = JSON.stringify({
    messages: requestBody.messages,
    system: requestBody.system,
    tools: requestBody.tools,
  })
  return Math.max(1, Math.round(serialized.length / 4))
}

function buildOpenAIRequestHeaders(
  sourceHeaders: Headers,
  isStreamingRequest: boolean | undefined,
  runtime: ResolvedOpenAICompatRuntimeConfig,
): Headers {
  const headers = new Headers()
  const apiKey = getOpenAICompatApiKey(runtime)
  const authHeaderName = runtime.apiKeyHeaderName
  const authHeaderNameLower = authHeaderName.toLowerCase()

  for (const [key, value] of sourceHeaders.entries()) {
    const lower = key.toLowerCase()
    // Anthropic SDK may synthesize auth headers from its required apiKey field
    // even when the compat gateway itself is intentionally authless.
    if (
      lower === 'anthropic-beta' ||
      lower === 'anthropic-version' ||
      lower === 'content-length' ||
      lower === 'host' ||
      lower === 'x-stainless-helper-method' ||
      lower === 'authorization' ||
      lower === 'x-api-key' ||
      lower === 'api-key' ||
      lower === authHeaderNameLower
    ) {
      continue
    }
    headers.set(key, value)
  }

  for (const [key, value] of Object.entries(runtime.customHeaders)) {
    headers.set(key, value)
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (isStreamingRequest) {
    headers.set('Accept', 'text/event-stream')
  }
  if (apiKey) {
    headers.set(authHeaderName, formatOpenAICompatApiKey(apiKey, runtime))
  }

  return headers
}

function getOpenAICompatCustomHeadersFromEnv(): Record<string, string> {
  const customHeadersEnv = process.env.OPENAI_COMPAT_CUSTOM_HEADERS
  if (!customHeadersEnv) {
    return {}
  }

  const trimmed = customHeadersEnv.trim()
  if (!trimmed) {
    return {}
  }

  if (trimmed.startsWith('{')) {
    const parsed = safeParseJSON(trimmed, false)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).flatMap(([key, value]) => {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            return [[key, String(value)]]
          }
          return []
        }),
      )
    }

    logForDebugging(
      '[API:openai-compat] OPENAI_COMPAT_CUSTOM_HEADERS must be a newline-delimited header list or a JSON object; ignoring invalid value',
      { level: 'error' },
    )
    return {}
  }

  const headers: Record<string, string> = {}
  const headerStrings = customHeadersEnv.split(/\n|\r\n/)

  for (const headerString of headerStrings) {
    if (!headerString.trim()) continue

    const colonIdx = headerString.indexOf(':')
    if (colonIdx === -1) continue

    const name = headerString.slice(0, colonIdx).trim()
    const value = headerString.slice(colonIdx + 1).trim()
    if (name) {
      headers[name] = value
    }
  }

  return headers
}

function getOpenAICompatExtraBodyFromEnv(): JsonObject {
  const extraBodyStr = process.env.OPENAI_COMPAT_EXTRA_BODY
  if (!extraBodyStr) {
    return {}
  }

  const parsed = safeParseJSON(extraBodyStr, false)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    // safeParseJSON is memoized, so clone before returning to avoid cache
    // poisoning if the caller mutates the object.
    return { ...(parsed as JsonObject) }
  }

  logForDebugging(
    '[API:openai-compat] OPENAI_COMPAT_EXTRA_BODY must be a JSON object; ignoring invalid value',
    { level: 'error' },
  )
  return {}
}

function formatOpenAICompatApiKey(
  apiKey: string,
  runtime: ResolvedOpenAICompatRuntimeConfig,
): string {
  if (runtime.apiKeyScheme === '') {
    return apiKey
  }

  return `${runtime.apiKeyScheme || 'Bearer'} ${apiKey}`
}

function getOpenAICompatProfileDefaults(
  config?: OpenAICompatRuntimeConfig,
): OpenAICompatProfileDefaults {
  return getOpenAICompatProfileDefaultsForProfile(
    config?.profile ?? process.env.OPENAI_COMPAT_PROFILE,
  )
}

function resolveOpenAICompatEndpoint(
  pathname: string,
  runtime: ResolvedOpenAICompatRuntimeConfig,
): URL {
  const configured = runtime.baseUrl
  if (!configured) {
    throw new Error(
      'OPENAI_BASE_URL is required when CLAUDE_CODE_USE_OPENAI_COMPAT=1 unless OPENAI_COMPAT_PROFILE provides a default base URL',
    )
  }

  const url = new URL(configured)
  const normalizedPath = url.pathname.replace(/\/+$/, '')
  const trimmedBasePath = stripKnownEndpointSuffix(normalizedPath)

  if (normalizedPath.endsWith(`/${pathname}`)) {
    return url
  }
  if (trimmedBasePath !== normalizedPath) {
    if (trimmedBasePath.endsWith('/v1')) {
      url.pathname = `${trimmedBasePath}/${pathname}`
      return url
    }
    url.pathname = trimmedBasePath
      ? `${trimmedBasePath}/v1/${pathname}`
      : `/v1/${pathname}`
    return url
  }
  if (normalizedPath.endsWith('/v1')) {
    url.pathname = `${normalizedPath}/${pathname}`
    return url
  }
  url.pathname = normalizedPath
    ? `${normalizedPath}/v1/${pathname}`
    : `/v1/${pathname}`
  return url
}

function stripKnownEndpointSuffix(pathname: string): string {
  const knownSuffixes = ['/v1/chat/completions', '/v1/responses', '/codex/responses']

  for (const suffix of knownSuffixes) {
    if (pathname.endsWith(suffix)) {
      return pathname.slice(0, -suffix.length) || ''
    }
  }

  return pathname
}

function shouldUseSyntheticModelsResponse(
  runtime: ResolvedOpenAICompatRuntimeConfig,
): boolean {
  try {
    const baseUrl = runtime.baseUrl
    if (!baseUrl) {
      return true
    }
    const pathname = new URL(baseUrl).pathname.replace(/\/+$/, '').toLowerCase()
    return (
      pathname.endsWith('/chat/completions') || pathname.endsWith('/responses')
    )
  } catch {
    return true
  }
}

function shouldFallbackToSyntheticModel(status: number): boolean {
  return status === 404 || status === 405 || status === 501
}

function buildSyntheticAnthropicModels(
  runtime?: ResolvedOpenAICompatRuntimeConfig,
): Array<Record<string, unknown>> {
  const ids = getSyntheticOpenAICompatModelIds(undefined, runtime)
  return ids.map(id => openAIModelToAnthropicModel({ id }))
}

function getSyntheticOpenAICompatModelIds(
  explicitId?: string | null,
  runtime?: ResolvedOpenAICompatRuntimeConfig,
): string[] {
  const ids = [
    explicitId,
    runtime?.model,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)

  if (ids.length === 0) {
    ids.push('openai-compatible-model')
  }

  return [...new Set(ids)]
}

function buildSyntheticModelsListResponse(
  requestId?: string,
  runtime?: ResolvedOpenAICompatRuntimeConfig,
): Response {
  const data = buildSyntheticAnthropicModels(runtime)
  return new Response(
    JSON.stringify({
      data,
      first_id: data[0]?.id ?? null,
      has_more: false,
      last_id: data.at(-1)?.id ?? null,
    }),
    {
      headers: buildAnthropicHeaders('application/json', requestId),
      status: 200,
    },
  )
}

function buildSyntheticModelRetrieveResponse(
  modelId?: string | null,
  requestId?: string,
  runtime?: ResolvedOpenAICompatRuntimeConfig,
): Response {
  const id = getSyntheticOpenAICompatModelIds(modelId, runtime)[0]
  return new Response(JSON.stringify(openAIModelToAnthropicModel({ id })), {
    headers: buildAnthropicHeaders('application/json', requestId),
    status: 200,
  })
}

function buildAnthropicErrorResponse(
  status: number,
  message: string,
  requestId?: string,
): Response {
  const type =
    status === 401 || status === 403
      ? 'authentication_error'
      : status === 404
        ? 'not_found_error'
        : status === 429
          ? 'rate_limit_error'
          : 'invalid_request_error'

  return new Response(
    JSON.stringify({
      error: {
        message,
        type,
      },
      type: 'error',
    }),
    {
      headers: buildAnthropicHeaders('application/json', requestId),
      status,
    },
  )
}

async function buildAnthropicErrorResponseFromUpstream(
  upstream: Response,
): Promise<Response> {
  const requestId = getUpstreamRequestId(upstream.headers)
  const raw = await upstream.text()
  const parsed = safeParseJSON(raw, false)
  const message =
    parsed &&
    typeof parsed === 'object' &&
    'error' in parsed &&
    parsed.error &&
    typeof parsed.error === 'object' &&
    'message' in parsed.error &&
    typeof parsed.error.message === 'string'
      ? parsed.error.message
      : raw || upstream.statusText || 'OpenAI-compatible request failed'

  return buildAnthropicErrorResponse(upstream.status, message, requestId)
}

function getUpstreamRequestId(headers: Headers): string {
  return (
    headers.get('request-id') ||
    headers.get('x-request-id') ||
    `req_${randomUUID().replaceAll('-', '')}`
  )
}

function buildAnthropicHeaders(
  contentType: string,
  requestId?: string,
): Headers {
  return new Headers({
    'content-type': contentType,
    'request-id': requestId || `req_${randomUUID().replaceAll('-', '')}`,
  })
}

function buildAnthropicStreamingResponse(
  upstream: Response,
  fallbackModel: string,
  requestId: string,
): Response {
  const reader = upstream.body?.getReader()
  if (!reader) {
    return buildAnthropicErrorResponse(
      502,
      'OpenAI-compatible adapter could not read the upstream stream body',
      requestId,
    )
  }

  const stream = new ReadableStream<Uint8Array>({
    cancel: async () => {
      await reader.cancel()
    },
    start(controller) {
      const decoder = new TextDecoder()
      let buffer = ''
      const state = createStreamState(fallbackModel, requestId)

      emitSSE(controller, 'message_start', createMessageStartPayload(state))

      const processRawEvent = (rawEvent: string) => {
        const data = extractSSEData(rawEvent)
        if (!data) {
          return false
        }
        if (data === '[DONE]') {
          return true
        }
        const parsed = safeParseJSON(data, false)
        if (!parsed || typeof parsed !== 'object') {
          return false
        }
        processOpenAIChunk(
          parsed as OpenAIResponse,
          controller,
          state,
          fallbackModel,
        )
        return false
      }

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              buffer += decoder.decode()
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const consumed = consumeSSEBuffer(buffer)
            buffer = consumed.remainder
            for (const rawEvent of consumed.events) {
              if (processRawEvent(rawEvent)) {
                finalizeAnthropicStream(controller, state)
                controller.close()
                return
              }
            }
          }

          if (buffer.trim()) {
            processRawEvent(buffer)
          }
          finalizeAnthropicStream(controller, state)
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }

      void pump()
    },
  })

  return new Response(stream, {
    headers: buildAnthropicHeaders('text/event-stream', requestId),
    status: 200,
  })
}

function buildAnthropicStreamResponseFromMessage(
  response: OpenAIResponse,
  fallbackModel: string,
  requestId: string,
): Response {
  const state = createStreamState(fallbackModel, requestId)
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      emitSSE(controller, 'message_start', createMessageStartPayload(state))
      processOpenAIMessage(response, controller, state)
      finalizeAnthropicStream(controller, state)
      controller.close()
    },
  })

  return new Response(stream, {
    headers: buildAnthropicHeaders('text/event-stream', requestId),
    status: 200,
  })
}

function buildAnthropicResponsesStreamingResponse(
  upstream: Response,
  fallbackModel: string,
  requestId: string,
): Response {
  const reader = upstream.body?.getReader()
  if (!reader) {
    return buildAnthropicErrorResponse(
      502,
      'OpenAI-compatible adapter could not read the upstream responses stream body',
      requestId,
    )
  }

  const stream = new ReadableStream<Uint8Array>({
    cancel: async () => {
      await reader.cancel()
    },
    start(controller) {
      const decoder = new TextDecoder()
      let buffer = ''
      const state = createStreamState(fallbackModel, requestId)

      emitSSE(controller, 'message_start', createMessageStartPayload(state))

      const processRawEvent = (rawEvent: string) => {
        const data = extractSSEData(rawEvent)
        if (!data) {
          return false
        }
        if (data === '[DONE]') {
          return true
        }
        const parsed = safeParseJSON(data, false)
        if (!parsed || typeof parsed !== 'object') {
          return false
        }
        processOpenAIResponsesEvent(
          parsed as OpenAIResponsesEvent,
          controller,
          state,
          fallbackModel,
        )
        return false
      }

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              buffer += decoder.decode()
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const consumed = consumeSSEBuffer(buffer)
            buffer = consumed.remainder
            for (const rawEvent of consumed.events) {
              if (processRawEvent(rawEvent)) {
                finalizeAnthropicStream(controller, state)
                controller.close()
                return
              }
            }
          }

          if (buffer.trim()) {
            processRawEvent(buffer)
          }
          finalizeAnthropicStream(controller, state)
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }

      void pump()
    },
  })

  return new Response(stream, {
    headers: buildAnthropicHeaders('text/event-stream', requestId),
    status: 200,
  })
}

function buildAnthropicResponsesStreamResponseFromResponse(
  response: OpenAIResponsesResponse,
  fallbackModel: string,
  requestId: string,
): Response {
  const state = createStreamState(fallbackModel, requestId)
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      emitSSE(controller, 'message_start', createMessageStartPayload(state))
      processOpenAIResponsesMessage(response, controller, state, fallbackModel)
      finalizeAnthropicStream(controller, state)
      controller.close()
    },
  })

  return new Response(stream, {
    headers: buildAnthropicHeaders('text/event-stream', requestId),
    status: 200,
  })
}

function createStreamState(fallbackModel: string, requestId: string) {
  return {
    finishReason: null as string | null,
    messageId: `msg_${requestId}`,
    model: fallbackModel,
    nextAnthropicIndex: 0,
    openContentBlockIndices: new Set<number>(),
    textBlockIndex: null as number | null,
    toolStates: new Map<number, ToolStreamState>(),
    usage: undefined as OpenAIUsage | undefined,
  }
}

function createMessageStartPayload(
  state: ReturnType<typeof createStreamState>,
): Record<string, unknown> {
  return {
    message: {
      container: null,
      content: [],
      context_management: null,
      id: state.messageId,
      model: state.model,
      role: 'assistant',
      stop_reason: null,
      stop_sequence: null,
      type: 'message',
      usage: EMPTY_ANTHROPIC_USAGE,
    },
    type: 'message_start',
  }
}

function processOpenAIResponsesMessage(
  response: OpenAIResponsesResponse,
  controller: ReadableStreamDefaultController<Uint8Array>,
  state: ReturnType<typeof createStreamState>,
  fallbackModel: string,
): void {
  applyOpenAIResponsesMetadata(response, state, fallbackModel)

  for (const [index, item] of (response.output ?? []).entries()) {
    processOpenAIResponsesOutputItem(item, index, controller, state, true)
  }

  if (
    state.textBlockIndex === null &&
    typeof response.output_text === 'string' &&
    response.output_text
  ) {
    ensureTextBlock(controller, state)
    emitSSE(controller, 'content_block_delta', {
      delta: {
        text: response.output_text,
        type: 'text_delta',
      },
      index: state.textBlockIndex,
      type: 'content_block_delta',
    })
  }
}

function processOpenAIResponsesEvent(
  event: OpenAIResponsesEvent,
  controller: ReadableStreamDefaultController<Uint8Array>,
  state: ReturnType<typeof createStreamState>,
  fallbackModel: string,
): void {
  switch (event.type) {
    case 'response.created':
    case 'response.in_progress':
      if (event.response) {
        applyOpenAIResponsesMetadata(event.response, state, fallbackModel)
      }
      return
    case 'response.completed':
      if (event.response) {
        processOpenAIResponsesMessage(
          event.response,
          controller,
          state,
          fallbackModel,
        )
      }
      return
    case 'response.output_item.added':
    case 'response.output_item.done':
      processOpenAIResponsesOutputItem(
        event.item,
        event.output_index,
        controller,
        state,
        event.type === 'response.output_item.done',
      )
      return
    case 'response.output_text.delta':
    case 'response.output_text.done': {
      const text =
        typeof event.delta === 'string'
          ? event.delta
          : typeof event.text === 'string'
            ? event.text
            : ''
      if (text) {
        ensureTextBlock(controller, state)
        emitSSE(controller, 'content_block_delta', {
          delta: {
            text,
            type: 'text_delta',
          },
          index: state.textBlockIndex,
          type: 'content_block_delta',
        })
      }
      return
    }
    case 'response.function_call_arguments.delta': {
      const toolState = getResponseToolState(event, state)
      if (typeof event.name === 'string' && event.name) {
        toolState.name = event.name
      }
      if (typeof event.delta === 'string' && event.delta.length > 0) {
        toolState.bufferedArgs.push(event.delta)
        toolState.sawArgumentsDelta = true
      }
      ensureToolBlock(controller, state, toolState)
      return
    }
    case 'response.function_call_arguments.done': {
      const toolState = getResponseToolState(event, state)
      if (typeof event.name === 'string' && event.name) {
        toolState.name = event.name
      }
      const finalArguments =
        typeof event.arguments === 'string' && event.arguments.length > 0
          ? event.arguments
          : toolState.bufferedArgs.join('')
      if (!toolState.argumentsFlushed && finalArguments.length > 0) {
        toolState.pendingArgs.push(finalArguments)
        toolState.argumentsFlushed = true
        toolState.bufferedArgs.length = 0
      }
      ensureToolBlock(controller, state, toolState)
      return
    }
    default:
      if (event.response) {
        applyOpenAIResponsesMetadata(event.response, state, fallbackModel)
      }
  }
}

function applyOpenAIResponsesMetadata(
  response: OpenAIResponsesResponse,
  state: ReturnType<typeof createStreamState>,
  fallbackModel: string,
): void {
  if (response.id) {
    state.messageId = response.id
  }
  if (response.model) {
    state.model = response.model
  } else {
    state.model ||= fallbackModel
  }
  if (response.usage) {
    state.usage = response.usage
  }
  if (response.incomplete_details?.reason) {
    state.finishReason = response.incomplete_details.reason
  }
}

function processOpenAIResponsesOutputItem(
  item: OpenAIResponsesOutputItem | undefined,
  outputIndex: number | undefined,
  controller: ReadableStreamDefaultController<Uint8Array>,
  state: ReturnType<typeof createStreamState>,
  isComplete: boolean,
): void {
  if (!item || typeof item !== 'object') {
    return
  }

  if (item.type === 'message') {
    if (!isComplete || state.textBlockIndex !== null) {
      return
    }
    const text = collectOpenAIResponsesMessageText(item.content)
    if (text) {
      ensureTextBlock(controller, state)
      emitSSE(controller, 'content_block_delta', {
        delta: {
          text,
          type: 'text_delta',
        },
        index: state.textBlockIndex,
        type: 'content_block_delta',
      })
    }
    return
  }

  if (item.type !== 'function_call') {
    return
  }

  const toolState = getOrCreateResponseToolState(
    outputIndex,
    item.id ?? undefined,
    state,
  )
  if (typeof item.call_id === 'string' && item.call_id) {
    toolState.callId = item.call_id
    toolState.id = item.call_id
  }
  if (typeof item.id === 'string' && item.id) {
    toolState.itemId = item.id
  }
  if (typeof item.name === 'string' && item.name) {
    toolState.name = item.name
  }
  if (isComplete && !toolState.argumentsFlushed) {
    const finalArguments =
      typeof item.arguments === 'string' && item.arguments.length > 0
        ? item.arguments
        : toolState.bufferedArgs.join('')
    if (finalArguments.length > 0) {
      toolState.pendingArgs.push(finalArguments)
      toolState.argumentsFlushed = true
      toolState.bufferedArgs.length = 0
    }
  }
  ensureToolBlock(controller, state, toolState)
}

function getResponseToolState(
  event: OpenAIResponsesEvent,
  state: ReturnType<typeof createStreamState>,
): ToolStreamState {
  if (typeof event.output_index === 'number') {
    return getOrCreateResponseToolState(event.output_index, event.item_id, state)
  }

  if (typeof event.item_id === 'string' && event.item_id) {
    const existing = findToolStateByItemId(event.item_id, state)
    if (existing) {
      return existing
    }
  }

  return getOrCreateResponseToolState(undefined, event.item_id, state)
}

function getOrCreateResponseToolState(
  key: number | undefined,
  itemId: string | undefined,
  state: ReturnType<typeof createStreamState>,
): ToolStreamState {
  const actualKey = typeof key === 'number' ? key : state.toolStates.size
  let toolState = state.toolStates.get(actualKey)
  if (!toolState) {
    toolState = {
      anthropicIndex: state.nextAnthropicIndex++,
      argumentsFlushed: false,
      bufferedArgs: [],
      callId: undefined,
      id: `call_${randomUUID().replaceAll('-', '')}`,
      itemId,
      pendingArgs: [],
      sawArgumentsDelta: false,
      started: false,
    }
    state.toolStates.set(actualKey, toolState)
  } else if (itemId) {
    toolState.itemId = itemId
  }

  return toolState
}

function findToolStateByItemId(
  itemId: string,
  state: ReturnType<typeof createStreamState>,
): ToolStreamState | undefined {
  for (const toolState of state.toolStates.values()) {
    if (toolState.itemId === itemId) {
      return toolState
    }
  }
  return undefined
}

function processOpenAIMessage(
  response: OpenAIResponse,
  controller: ReadableStreamDefaultController<Uint8Array>,
  state: ReturnType<typeof createStreamState>,
): void {
  if (response.model) {
    state.model = response.model
  }
  state.usage = response.usage

  for (const choice of response.choices ?? []) {
    const message = choice.message
    if (!message) {
      continue
    }

    const text = collectOpenAIMessageText(message.content)
    if (text) {
      ensureTextBlock(controller, state)
      emitSSE(controller, 'content_block_delta', {
        delta: {
          text,
          type: 'text_delta',
        },
        index: state.textBlockIndex,
        type: 'content_block_delta',
      })
    }

    processToolCallDeltas(message.tool_calls, controller, state)
    if (choice.finish_reason) {
      state.finishReason = choice.finish_reason
    }
  }
}

function processOpenAIChunk(
  chunk: OpenAIResponse,
  controller: ReadableStreamDefaultController<Uint8Array>,
  state: ReturnType<typeof createStreamState>,
  fallbackModel: string,
): void {
  if (chunk.id) {
    state.messageId = chunk.id
  }
  if (chunk.model) {
    state.model = chunk.model
  } else {
    state.model ||= fallbackModel
  }
  if (chunk.usage) {
    state.usage = chunk.usage
  }

  for (const choice of chunk.choices ?? []) {
    const delta = choice.delta
    if (!delta) {
      if (choice.finish_reason) {
        state.finishReason = choice.finish_reason
      }
      continue
    }

    const text = collectOpenAIMessageText(delta.content)
    if (text) {
      ensureTextBlock(controller, state)
      emitSSE(controller, 'content_block_delta', {
        delta: {
          text,
          type: 'text_delta',
        },
        index: state.textBlockIndex,
        type: 'content_block_delta',
      })
    }

    processToolCallDeltas(delta.tool_calls, controller, state)
    if (choice.finish_reason) {
      state.finishReason = choice.finish_reason
    }
  }
}

function processToolCallDeltas(
  toolCalls: OpenAIToolCall[] | undefined,
  controller: ReadableStreamDefaultController<Uint8Array>,
  state: ReturnType<typeof createStreamState>,
): void {
  if (!Array.isArray(toolCalls)) {
    return
  }

  for (const toolCall of toolCalls) {
    const key =
      typeof toolCall.index === 'number'
        ? toolCall.index
        : state.toolStates.size
    let toolState = state.toolStates.get(key)
    if (!toolState) {
      toolState = {
        anthropicIndex: state.nextAnthropicIndex++,
        argumentsFlushed: false,
        bufferedArgs: [],
        callId: undefined,
        id:
          typeof toolCall.id === 'string' && toolCall.id
            ? toolCall.id
            : `call_${randomUUID().replaceAll('-', '')}`,
        itemId: undefined,
        pendingArgs: [],
        sawArgumentsDelta: false,
        started: false,
      }
      state.toolStates.set(key, toolState)
    }

    if (typeof toolCall.id === 'string' && toolCall.id) {
      toolState.callId = toolCall.id
      toolState.id = toolCall.id
    }
    if (typeof toolCall.function?.name === 'string' && toolCall.function.name) {
      toolState.name = toolCall.function.name
    }
    if (
      typeof toolCall.function?.arguments === 'string' &&
      toolCall.function.arguments.length > 0
    ) {
      toolState.pendingArgs.push(toolCall.function.arguments)
      toolState.sawArgumentsDelta = true
    }

    ensureToolBlock(controller, state, toolState)
  }
}

function ensureTextBlock(
  controller: ReadableStreamDefaultController<Uint8Array>,
  state: ReturnType<typeof createStreamState>,
): void {
  if (state.textBlockIndex !== null) {
    return
  }

  state.textBlockIndex = state.nextAnthropicIndex++
  state.openContentBlockIndices.add(state.textBlockIndex)
  emitSSE(controller, 'content_block_start', {
    content_block: {
      citations: null,
      text: '',
      type: 'text',
    },
    index: state.textBlockIndex,
    type: 'content_block_start',
  })
}

function ensureToolBlock(
  controller: ReadableStreamDefaultController<Uint8Array>,
  state: ReturnType<typeof createStreamState>,
  toolState: ToolStreamState,
): void {
  if (!toolState.started && toolState.name) {
    toolState.started = true
    state.openContentBlockIndices.add(toolState.anthropicIndex)
    emitSSE(controller, 'content_block_start', {
      content_block: {
        id: toolState.id,
        input: {},
        name: toolState.name,
        type: 'tool_use',
      },
      index: toolState.anthropicIndex,
      type: 'content_block_start',
    })
  }

  if (!toolState.started) {
    return
  }

  for (const partialJson of toolState.pendingArgs) {
    emitSSE(controller, 'content_block_delta', {
      delta: {
        partial_json: partialJson,
        type: 'input_json_delta',
      },
      index: toolState.anthropicIndex,
      type: 'content_block_delta',
    })
  }
  toolState.pendingArgs.length = 0
}

function finalizeAnthropicStream(
  controller: ReadableStreamDefaultController<Uint8Array>,
  state: ReturnType<typeof createStreamState>,
): void {
  for (const toolState of state.toolStates.values()) {
    if (!toolState.started) {
      toolState.name ||= 'tool'
      ensureToolBlock(controller, state, toolState)
    }
  }

  const openIndices = [...state.openContentBlockIndices].sort((a, b) => a - b)
  for (const index of openIndices) {
    emitSSE(controller, 'content_block_stop', {
      index,
      type: 'content_block_stop',
    })
  }

  emitSSE(controller, 'message_delta', {
    context_management: null,
    delta: {
      container: null,
      stop_reason: mapFinishReason(
        state.finishReason,
        state.toolStates.size > 0,
      ),
      stop_sequence: null,
    },
    type: 'message_delta',
    usage: createAnthropicDeltaUsage(state.usage),
  })
  emitSSE(controller, 'message_stop', {
    type: 'message_stop',
  })
}

function consumeSSEBuffer(buffer: string): {
  events: string[]
  remainder: string
} {
  const events: string[] = []
  let rest = buffer

  while (true) {
    const match = rest.match(/\r?\n\r?\n/)
    if (!match || match.index === undefined) {
      break
    }
    events.push(rest.slice(0, match.index))
    rest = rest.slice(match.index + match[0].length)
  }

  return {
    events,
    remainder: rest,
  }
}

function extractSSEData(rawEvent: string): string {
  return rawEvent
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())
    .join('\n')
}

function emitSSE(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  payload: Record<string, unknown>,
): void {
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
  )
}

function openAIModelToAnthropicModel(model: Record<string, unknown>) {
  const id = typeof model.id === 'string' ? model.id : 'unknown-model'
  return {
    capabilities: null,
    created_at: '1970-01-01T00:00:00.000Z',
    display_name: id,
    id,
    max_input_tokens: null,
    max_tokens: null,
    type: 'model',
  }
}
