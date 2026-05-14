export interface Env {
  DB: D1Database
  API_KEY_CACHE: KVNamespace
  SETTINGS_CACHE: KVNamespace
  RATE_LIMIT: KVNamespace
  GATEWAY_STATE: KVNamespace
  BACKUPS: R2Bucket
  ASSETS: Fetcher
  JWT_SECRET?: string
  CREDENTIAL_SECRET?: string
  ADMIN_BOOTSTRAP_TOKEN?: string
}

export interface AppVariables {
  adminUser: AdminUser
  apiKeyAuth: ApiKeyAuth
}

export type AppEnv = {
  Bindings: Env
  Variables: AppVariables
}

export interface AdminUser {
  id: number
  email: string
  display_name: string
  role: 'admin'
}

export interface ApiKeyAuth {
  apiKeyId: number
  userId: number
  groupId: number | null
  groupStatus: string | null
  keyHash: string
}

export interface UpstreamAccount {
  id: number
  name: string
  platform: Platform
  auth_type: 'api_key' | 'oauth'
  credential_ciphertext: string
  base_url: string | null
  priority: number
  status: string
}

export type Platform = 'anthropic' | 'openai' | 'gemini'

export interface UsageRecordInput {
  request_id: string
  user_id: number
  api_key_id: number
  group_id: number | null
  upstream_account_id: number | null
  platform: Platform
  endpoint: string
  upstream_endpoint: string
  model: string | null
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  estimated_cost_micro_usd: number
  status_code: number
  duration_ms: number
  is_stream: boolean
  error_message: string | null
}

