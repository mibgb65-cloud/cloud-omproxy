import { sha256Hex } from '../utils/crypto'

const OPENAI_CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const OPENAI_TOKEN_URL = 'https://auth.openai.com/oauth/token'
const OPENAI_REFRESH_SCOPE = 'openid profile email'
const CODEX_IMPORT_CLOCK_SKEW_SECONDS = 120

export interface CodexSessionCredentials {
  access_token: string
  refresh_token?: string
  id_token?: string
  expires_at?: string
  email?: string
  chatgpt_account_id?: string
  chatgpt_user_id?: string
  organization_id?: string
  plan_type?: string
  client_id?: string
}

export interface CodexSessionMeta {
  email?: string
  chatgpt_account_id?: string
  chatgpt_user_id?: string
  organization_id?: string
  plan_type?: string
  expires_at?: string
  refreshable: boolean
  imported_at: string
  access_token_sha256: string
}

export interface CodexImportEntry {
  index: number
  value: unknown
}

export interface NormalizedCodexSession {
  name: string
  credentials: CodexSessionCredentials
  meta: CodexSessionMeta
  identity_keys: string[]
  warnings: string[]
}

export interface CodexImportMessage {
  index: number
  name?: string
  message: string
}

export interface CodexImportItem {
  index: number
  name?: string
  action: 'created' | 'updated' | 'skipped' | 'failed'
  account_id?: number
  message?: string
}

export interface CodexTokenRefreshResult {
  credentials: CodexSessionCredentials
  meta: CodexSessionMeta
}

interface CodexJwtClaims {
  sub?: string
  email?: string
  exp?: number
  iat?: number
  'https://api.openai.com/auth'?: {
    chatgpt_account_id?: string
    chatgpt_user_id?: string
    chatgpt_plan_type?: string
    user_id?: string
    poid?: string
    organizations?: Array<{ id?: string; is_default?: boolean }>
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function pathValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj
  for (const key of path) {
    if (!isRecord(current)) return undefined
    current = current[key]
  }
  return current
}

function firstString(obj: Record<string, unknown>, ...paths: string[][]): string {
  for (const path of paths) {
    const value = stringValue(pathValue(obj, path))
    if (value) return value
  }
  return ''
}

function parseTime(value: unknown): Date | null {
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return null
    const numeric = Number(text)
    if (Number.isFinite(numeric)) return unixTime(numeric)
    const parsed = new Date(text)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === 'number' && Number.isFinite(value)) return unixTime(value)
  return null
}

function firstTime(obj: Record<string, unknown>, ...paths: string[][]): Date | null {
  for (const path of paths) {
    const value = parseTime(pathValue(obj, path))
    if (value) return value
  }
  return null
}

function unixTime(value: number): Date {
  return new Date(value > 1_000_000_000_000 ? value : value * 1000)
}

function looksLikeJson(content: string): boolean {
  return content.startsWith('{') || content.startsWith('[')
}

function flatten(values: unknown[]): unknown[] {
  const out: unknown[] = []
  const append = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(append)
      return
    }
    out.push(value)
  }
  values.forEach(append)
  return out
}

function parseContent(content: string): unknown[] {
  const trimmed = content.trim()
  if (!trimmed) return []
  if (looksLikeJson(trimmed)) {
    try {
      return flatten([JSON.parse(trimmed)])
    } catch (error) {
      if (!trimmed.includes('\n')) throw new Error(`JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const values: unknown[] = []
  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  for (const line of lines) {
    if (looksLikeJson(line)) {
      try {
        values.push(...flatten([JSON.parse(line)]))
      } catch (error) {
        throw new Error(`第 ${values.length + 1} 行 JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    } else {
      values.push(line)
    }
  }
  return values
}

export function parseCodexImportEntries(input: { content?: string; contents?: string[] }): CodexImportEntry[] {
  const contents: string[] = []
  if (input.content?.trim()) contents.push(input.content)
  for (const content of input.contents ?? []) {
    if (content.trim()) contents.push(content)
  }
  const entries: CodexImportEntry[] = []
  for (const content of contents) {
    for (const value of parseContent(content)) {
      entries.push({ index: entries.length + 1, value })
    }
  }
  return entries
}

function decodeBase64Url(segment: string): Uint8Array {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function decodeJwtClaims(token: string): CodexJwtClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as CodexJwtClaims
  } catch {
    return null
  }
}

function enrichFromJwt(item: Partial<CodexSessionCredentials>, token: string, validateExpiry: boolean, warnings: string[]) {
  const claims = decodeJwtClaims(token)
  if (!claims) {
    if (validateExpiry) warnings.push('accessToken 不是可解析 JWT，无法校验过期时间和账号身份')
    return
  }

  if (validateExpiry && claims.exp) {
    const expiresAt = new Date(claims.exp * 1000)
    if (Date.now() > expiresAt.getTime() + CODEX_IMPORT_CLOCK_SKEW_SECONDS * 1000) {
      throw new Error(`access_token 已过期: ${expiresAt.toISOString()}`)
    }
    item.expires_at = expiresAt.toISOString()
  }

  if (!item.email) item.email = stringValue(claims.email)
  const openaiAuth = claims['https://api.openai.com/auth']
  if (!openaiAuth) {
    if (!item.chatgpt_user_id) item.chatgpt_user_id = stringValue(claims.sub)
    return
  }

  item.chatgpt_account_id ||= stringValue(openaiAuth.chatgpt_account_id)
  item.chatgpt_user_id ||= stringValue(openaiAuth.chatgpt_user_id) || stringValue(openaiAuth.user_id) || stringValue(claims.sub)
  item.plan_type ||= stringValue(openaiAuth.chatgpt_plan_type)
  item.organization_id ||= stringValue(openaiAuth.poid)
  if (!item.organization_id && Array.isArray(openaiAuth.organizations)) {
    item.organization_id =
      stringValue(openaiAuth.organizations.find((org) => org?.is_default)?.id) ||
      stringValue(openaiAuth.organizations[0]?.id)
  }
}

function identityKeys(credentials: CodexSessionCredentials, accessToken: string, fingerprint: string): string[] {
  const keys: string[] = []
  if (credentials.chatgpt_account_id) keys.push(`account:${credentials.chatgpt_account_id}`)
  if (credentials.chatgpt_user_id) keys.push(`user:${credentials.chatgpt_user_id}`)
  if (!credentials.chatgpt_account_id && !credentials.chatgpt_user_id && credentials.email) {
    keys.push(`email:${credentials.email.toLowerCase()}`)
  }
  if (accessToken) keys.push(`access:${fingerprint}`)
  return keys
}

function accountName(credentials: CodexSessionCredentials, fallbackIndex: number): string {
  return credentials.email || credentials.chatgpt_account_id || credentials.chatgpt_user_id || `Codex 导入账号 ${fallbackIndex}`
}

export async function normalizeCodexImportEntry(entry: CodexImportEntry): Promise<NormalizedCodexSession> {
  const warnings: string[] = []
  const credentials: CodexSessionCredentials = { access_token: '' }
  let rawName = ''

  if (typeof entry.value === 'string') {
    credentials.access_token = entry.value.trim()
  } else if (isRecord(entry.value)) {
    credentials.access_token = firstString(
      entry.value,
      ['tokens', 'access_token'],
      ['tokens', 'accessToken'],
      ['access_token'],
      ['accessToken'],
      ['token'],
    )
    credentials.refresh_token = firstString(
      entry.value,
      ['tokens', 'refresh_token'],
      ['tokens', 'refreshToken'],
      ['refresh_token'],
      ['refreshToken'],
    )
    credentials.id_token = firstString(entry.value, ['tokens', 'id_token'], ['tokens', 'idToken'], ['id_token'], ['idToken'])
    credentials.email = firstString(entry.value, ['email'], ['user', 'email'])
    credentials.chatgpt_account_id = firstString(
      entry.value,
      ['chatgpt_account_id'],
      ['chatgptAccountId'],
      ['account_id'],
      ['accountId'],
      ['account', 'id'],
      ['account', 'account_id'],
      ['account', 'chatgpt_account_id'],
    )
    credentials.chatgpt_user_id = firstString(entry.value, ['chatgpt_user_id'], ['chatgptUserId'], ['user_id'], ['userId'], ['user', 'id'])
    credentials.plan_type = firstString(entry.value, ['plan_type'], ['planType'], ['account', 'plan_type'], ['account', 'planType'])
    credentials.organization_id = firstString(entry.value, ['organization_id'], ['organizationId'], ['org_id'], ['orgId'])
    rawName = firstString(entry.value, ['name'], ['user', 'name'])

    if (firstString(entry.value, ['session_token'], ['sessionToken'])) {
      warnings.push('sessionToken 已忽略，不会作为 OAuth refresh_token 存储')
    }

    const expiresAt = firstTime(entry.value, ['tokens', 'expires_at'], ['tokens', 'expiresAt'], ['expires_at'], ['expiresAt'])
    if (expiresAt) {
      if (expiresAt.getTime() <= Date.now() - CODEX_IMPORT_CLOCK_SKEW_SECONDS * 1000) {
        throw new Error(`access_token 已过期: ${expiresAt.toISOString()}`)
      }
      credentials.expires_at = expiresAt.toISOString()
    }
  } else {
    throw new Error(`第 ${entry.index} 条格式不支持`)
  }

  if (!credentials.access_token) throw new Error('缺少 accessToken/access_token')
  if (credentials.refresh_token) credentials.client_id = OPENAI_CODEX_CLIENT_ID
  if (credentials.id_token) enrichFromJwt(credentials, credentials.id_token, false, warnings)
  enrichFromJwt(credentials, credentials.access_token, true, warnings)

  if (!credentials.expires_at) warnings.push('无法从 accessToken 解析过期时间，导入后需自行确认令牌有效性')
  if (!credentials.refresh_token) {
    warnings.push('未包含 refresh_token，accessToken 过期后无法自动续期')
    if (!credentials.expires_at) throw new Error('未包含 refresh_token，且无法解析 accessToken 过期时间')
  }

  const fingerprint = await sha256Hex(credentials.access_token)
  const meta = buildCodexMeta(credentials, fingerprint)
  const name = rawName || accountName(credentials, entry.index)
  return {
    name,
    credentials,
    meta,
    identity_keys: identityKeys(credentials, credentials.access_token, fingerprint),
    warnings,
  }
}

export function buildCodexMeta(credentials: CodexSessionCredentials, fingerprint: string): CodexSessionMeta {
  return {
    email: credentials.email,
    chatgpt_account_id: credentials.chatgpt_account_id,
    chatgpt_user_id: credentials.chatgpt_user_id,
    organization_id: credentials.organization_id,
    plan_type: credentials.plan_type,
    expires_at: credentials.expires_at,
    refreshable: Boolean(credentials.refresh_token),
    imported_at: new Date().toISOString(),
    access_token_sha256: fingerprint,
  }
}

export function codexIdentityKeysFromMeta(meta: unknown): string[] {
  if (!isRecord(meta)) return []
  const keys: string[] = []
  const accountId = stringValue(meta.chatgpt_account_id)
  const userId = stringValue(meta.chatgpt_user_id)
  const email = stringValue(meta.email)
  const fingerprint = stringValue(meta.access_token_sha256)
  if (accountId) keys.push(`account:${accountId}`)
  if (userId) keys.push(`user:${userId}`)
  if (!accountId && !userId && email) keys.push(`email:${email.toLowerCase()}`)
  if (fingerprint) keys.push(`access:${fingerprint}`)
  return keys
}

export function isCodexTokenExpired(credentials: CodexSessionCredentials, skewSeconds = 180): boolean {
  if (!credentials.expires_at) return false
  const expiresAt = new Date(credentials.expires_at).getTime()
  if (Number.isNaN(expiresAt)) return false
  return Date.now() >= expiresAt - skewSeconds * 1000
}

export async function refreshCodexAccessToken(credentials: CodexSessionCredentials): Promise<CodexTokenRefreshResult> {
  if (!credentials.refresh_token) throw new Error('refresh_token not found in Codex credentials')
  const params = new URLSearchParams()
  params.set('grant_type', 'refresh_token')
  params.set('refresh_token', credentials.refresh_token)
  params.set('client_id', credentials.client_id || OPENAI_CODEX_CLIENT_ID)
  params.set('scope', OPENAI_REFRESH_SCOPE)

  const response = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'codex-cli/0.91.0',
    },
    body: params.toString(),
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(`OpenAI OAuth token refresh failed: status ${response.status}`)
  }

  const accessToken = stringValue(payload.access_token)
  if (!accessToken) throw new Error('OpenAI OAuth refresh response missing access_token')
  const next: CodexSessionCredentials = {
    ...credentials,
    access_token: accessToken,
    refresh_token: stringValue(payload.refresh_token) || credentials.refresh_token,
    id_token: stringValue(payload.id_token) || credentials.id_token,
    client_id: credentials.client_id || OPENAI_CODEX_CLIENT_ID,
  }
  const expiresIn = Number(payload.expires_in)
  if (Number.isFinite(expiresIn) && expiresIn > 0) next.expires_at = new Date(Date.now() + expiresIn * 1000).toISOString()

  const warnings: string[] = []
  if (next.id_token) enrichFromJwt(next, next.id_token, false, warnings)
  enrichFromJwt(next, next.access_token, false, warnings)
  const fingerprint = await sha256Hex(next.access_token)
  return { credentials: next, meta: buildCodexMeta(next, fingerprint) }
}
