export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface UserItem {
  id: number
  email: string
  display_name: string
  role: 'admin' | 'member'
  status: 'active' | 'disabled'
  daily_request_limit: number | null
  daily_cost_limit_micro_usd: number | null
  created_at: string
}

export interface GroupItem {
  id: number
  name: string
  description: string | null
  default_platform: 'anthropic' | 'openai' | 'gemini' | null
  status: 'active' | 'disabled'
  sort_order: number
}

export interface ApiKeyItem {
  id: number
  user_id: number
  user_name: string
  group_id: number | null
  group_name: string | null
  name: string
  key_prefix: string
  status: 'active' | 'disabled'
  last_used_at: string | null
  expires_at: string | null
}

export interface UpstreamAccountItem {
  id: number
  name: string
  platform: 'anthropic' | 'openai' | 'gemini'
  auth_type: 'api_key' | 'oauth'
  status: 'active' | 'disabled' | 'error'
  priority: number
  cooldown_until: string | null
  last_error_message: string | null
  last_used_at: string | null
}

export interface UsageLogItem {
  id: number
  request_id: string
  user_id: number
  api_key_id: number
  platform: string
  endpoint: string
  model: string | null
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  estimated_cost_micro_usd: number
  status_code: number
  duration_ms: number | null
  is_stream: number
  error_message: string | null
  created_at: string
}

export interface BackupItem {
  id: number
  backup_type: string
  file_name: string
  file_size: number
  status: 'pending' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  completed_at: string | null
}

