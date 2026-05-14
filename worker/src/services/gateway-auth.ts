import type { ApiKeyAuth, Env } from '../types'
import { hashApiKey } from '../utils/crypto'

export async function authenticateGatewayKey(env: Env, apiKey: string): Promise<ApiKeyAuth | null> {
  const keyHash = await hashApiKey(apiKey)
  const cacheKey = `api-key:${keyHash}`
  const cached = await env.API_KEY_CACHE.get<ApiKeyAuth>(cacheKey, 'json')
  if (cached) return cached

  const row = await env.DB.prepare(
    "SELECT k.id AS api_key_id, k.user_id, k.group_id, g.status AS group_status FROM api_keys k JOIN users u ON u.id = k.user_id LEFT JOIN groups g ON g.id = k.group_id WHERE k.key_hash = ? AND k.status = 'active' AND k.deleted_at IS NULL AND u.status = 'active' AND u.deleted_at IS NULL AND (k.expires_at IS NULL OR k.expires_at > CURRENT_TIMESTAMP)",
  )
    .bind(keyHash)
    .first<{ api_key_id: number; user_id: number; group_id: number | null; group_status: string | null }>()

  if (!row) return null
  const auth: ApiKeyAuth = {
    apiKeyId: row.api_key_id,
    userId: row.user_id,
    groupId: row.group_id,
    groupStatus: row.group_status,
    keyHash,
  }
  await env.API_KEY_CACHE.put(cacheKey, JSON.stringify(auth), { expirationTtl: 300 })
  return auth
}

