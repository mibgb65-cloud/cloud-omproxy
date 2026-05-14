import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ApiKeyAuth, AppEnv, Platform, UpstreamAccount } from '../types'
import { decryptSecret, randomToken } from '../utils/crypto'
import { getBearerToken } from '../utils/http'
import { authenticateGatewayKey } from '../services/gateway-auth'
import { estimateCost, recordUsage } from '../services/usage'

export const gatewayRoutes = new Hono<AppEnv>()

const defaultBaseUrl: Record<Platform, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
  gemini: 'https://generativelanguage.googleapis.com',
}

function authError(platform: Platform) {
  if (platform === 'gemini') {
    return Response.json({ error: { code: 401, message: 'Invalid API key' } }, { status: 401 })
  }
  if (platform === 'openai') {
    return Response.json({ error: { type: 'authentication_error', message: 'Invalid API key' } }, { status: 401 })
  }
  return Response.json(
    { type: 'error', error: { type: 'authentication_error', message: 'Invalid API key' } },
    { status: 401 },
  )
}

function detectPlatform(pathname: string): Platform {
  if (pathname.startsWith('/v1beta')) return 'gemini'
  if (pathname.includes('/chat/completions') || pathname.includes('/responses')) return 'openai'
  return 'anthropic'
}

function upstreamPath(pathname: string, platform: Platform): string {
  if (platform === 'openai' && pathname === '/responses') return '/v1/responses'
  return pathname
}

async function scheduleAccounts(env: AppEnv['Bindings'], platform: Platform, auth: ApiKeyAuth): Promise<UpstreamAccount[]> {
  if (!auth.groupId) return []
  return (
    (
      await env.DB.prepare(
        "SELECT a.* FROM upstream_accounts a JOIN account_groups ag ON ag.account_id = a.id WHERE ag.group_id = ? AND a.platform = ? AND a.status = 'active' AND a.deleted_at IS NULL AND (a.cooldown_until IS NULL OR a.cooldown_until < CURRENT_TIMESTAMP) ORDER BY ag.priority ASC, a.priority ASC, (a.last_used_at IS NOT NULL) ASC, a.last_used_at ASC LIMIT 5",
      )
        .bind(auth.groupId, platform)
        .all<UpstreamAccount>()
    ).results ?? []
  )
}

function buildHeaders(original: Request, platform: Platform, credential: string): Headers {
  const headers = new Headers()
  original.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (['host', 'authorization', 'content-length', 'cf-connecting-ip'].includes(lower)) return
    headers.set(key, value)
  })
  if (platform === 'anthropic') {
    headers.set('x-api-key', credential)
    if (!headers.has('anthropic-version')) headers.set('anthropic-version', '2023-06-01')
  } else if (platform === 'openai') {
    headers.set('Authorization', `Bearer ${credential}`)
  } else {
    headers.set('x-goog-api-key', credential)
  }
  return headers
}

function extractUsage(platform: Platform, payload: unknown) {
  const data = payload as Record<string, unknown>
  const usage = (data.usage ?? data.usageMetadata ?? {}) as Record<string, unknown>
  if (platform === 'openai') {
    return {
      input: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
      output: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
      cacheRead: Number(usage.input_token_details && typeof usage.input_token_details === 'object' ? (usage.input_token_details as Record<string, unknown>).cached_tokens ?? 0 : 0),
      cacheWrite: 0,
    }
  }
  if (platform === 'gemini') {
    return {
      input: Number(usage.promptTokenCount ?? 0),
      output: Number(usage.candidatesTokenCount ?? 0),
      cacheRead: Number(usage.cachedContentTokenCount ?? 0),
      cacheWrite: 0,
    }
  }
  return {
    input: Number(usage.input_tokens ?? 0),
    output: Number(usage.output_tokens ?? 0),
    cacheRead: Number(usage.cache_read_input_tokens ?? 0),
    cacheWrite: Number(usage.cache_creation_input_tokens ?? 0),
  }
}

async function parseRequestBody(request: Request): Promise<{ model: string | null; stream: boolean }> {
  try {
    const body = (await request.clone().json()) as Record<string, unknown>
    return {
      model: typeof body.model === 'string' ? body.model : null,
      stream: body.stream === true || body.stream === 'true',
    }
  } catch {
    return { model: null, stream: false }
  }
}

async function gatewayHandler(c: Context<AppEnv>) {
  const platform = detectPlatform(new URL(c.req.url).pathname)
  const token = getBearerToken(c.req.header('Authorization') ?? null)
  if (!token) return authError(platform)
  const auth = await authenticateGatewayKey(c.env, token)
  if (!auth || auth.groupStatus === 'disabled') return authError(platform)
  if (!c.env.CREDENTIAL_SECRET) return Response.json({ error: { message: 'CREDENTIAL_SECRET not configured' } }, { status: 500 })

  const request = c.req.raw
  const started = Date.now()
  const requestId = c.req.header('x-request-id') || `req_${randomToken(12)}`
  const endpoint = new URL(request.url).pathname
  const targetPath = upstreamPath(endpoint, platform)
  const requestInfo = await parseRequestBody(request)
  const requestBody = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.clone().arrayBuffer()
  const accounts = await scheduleAccounts(c.env, platform, auth)
  if (!accounts.length) return Response.json({ error: { message: 'No upstream account available' } }, { status: 503 })

  let lastResponse: Response | null = null
  for (const account of accounts) {
    const credential = await decryptSecret(account.credential_ciphertext, c.env.CREDENTIAL_SECRET)
    const base = account.base_url || defaultBaseUrl[platform]
    const upstreamUrl = new URL(targetPath + new URL(request.url).search, base).toString()
    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: buildHeaders(request, platform, credential),
      body: requestBody,
    })
    const response = await fetch(upstreamRequest)
    lastResponse = response

    await c.env.DB.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').bind(auth.apiKeyId).run()
    await c.env.DB.prepare('UPDATE upstream_accounts SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').bind(account.id).run()

    if ([429, 500, 502, 503, 504].includes(response.status)) {
      await c.env.DB.prepare(
        "UPDATE upstream_accounts SET failure_count = failure_count + 1, last_error_message = ?, cooldown_until = datetime('now', '+60 seconds') WHERE id = ?",
      )
        .bind(`upstream status ${response.status}`, account.id)
        .run()
      continue
    }

    c.executionCtx.waitUntil(
      (async () => {
        let inputTokens = 0
        let outputTokens = 0
        let cacheReadTokens = 0
        let cacheWriteTokens = 0
        if (!requestInfo.stream) {
          try {
            const payload = await response.clone().json()
            const usage = extractUsage(platform, payload)
            inputTokens = usage.input
            outputTokens = usage.output
            cacheReadTokens = usage.cacheRead
            cacheWriteTokens = usage.cacheWrite
          } catch {
            // Non-JSON upstream responses still get request-level logging.
          }
        }
        const estimated = await estimateCost(c.env, platform, requestInfo.model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens)
        await recordUsage(c.env, {
          request_id: requestId,
          user_id: auth.userId,
          api_key_id: auth.apiKeyId,
          group_id: auth.groupId,
          upstream_account_id: account.id,
          platform,
          endpoint,
          upstream_endpoint: targetPath,
          model: requestInfo.model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cache_read_tokens: cacheReadTokens,
          cache_write_tokens: cacheWriteTokens,
          estimated_cost_micro_usd: estimated,
          status_code: response.status,
          duration_ms: Date.now() - started,
          is_stream: requestInfo.stream,
          error_message: response.ok ? null : `status ${response.status}`,
        })
      })(),
    )

    return response
  }

  return lastResponse ?? Response.json({ error: { message: 'No upstream response' } }, { status: 503 })
}

gatewayRoutes.post('/v1/messages', gatewayHandler)
gatewayRoutes.get('/v1/models', gatewayHandler)
gatewayRoutes.post('/v1/chat/completions', gatewayHandler)
gatewayRoutes.post('/chat/completions', gatewayHandler)
gatewayRoutes.post('/v1/responses', gatewayHandler)
gatewayRoutes.post('/v1/responses/*', gatewayHandler)
gatewayRoutes.post('/responses', gatewayHandler)
gatewayRoutes.post('/responses/*', gatewayHandler)
gatewayRoutes.get('/v1beta/models', gatewayHandler)
gatewayRoutes.get('/v1beta/models/:model', gatewayHandler)
gatewayRoutes.post('/v1beta/models/*', gatewayHandler)
