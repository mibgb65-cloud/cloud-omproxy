import type { Env, UsageRecordInput } from '../types'

export async function estimateCost(
  env: Env,
  platform: string,
  model: string | null,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
): Promise<number> {
  if (!model) return 0
  const price = await env.DB.prepare(
    "SELECT input_price_micro_usd_per_token, output_price_micro_usd_per_token, cache_read_price_micro_usd_per_token, cache_write_price_micro_usd_per_token FROM model_prices WHERE platform = ? AND model = ? AND status = 'active'",
  )
    .bind(platform, model)
    .first<{
      input_price_micro_usd_per_token: number
      output_price_micro_usd_per_token: number
      cache_read_price_micro_usd_per_token: number
      cache_write_price_micro_usd_per_token: number
    }>()
  if (!price) return 0
  return (
    inputTokens * price.input_price_micro_usd_per_token +
    outputTokens * price.output_price_micro_usd_per_token +
    cacheReadTokens * price.cache_read_price_micro_usd_per_token +
    cacheWriteTokens * price.cache_write_price_micro_usd_per_token
  )
}

export async function recordUsage(env: Env, input: UsageRecordInput): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, upstream_account_id, platform, endpoint, upstream_endpoint, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, estimated_cost_micro_usd, status_code, duration_ms, is_stream, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      input.request_id,
      input.user_id,
      input.api_key_id,
      input.group_id,
      input.upstream_account_id,
      input.platform,
      input.endpoint,
      input.upstream_endpoint,
      input.model,
      input.input_tokens,
      input.output_tokens,
      input.cache_read_tokens,
      input.cache_write_tokens,
      input.estimated_cost_micro_usd,
      input.status_code,
      input.duration_ms,
      input.is_stream ? 1 : 0,
      input.error_message,
    )
    .run()

  const statDate = new Date().toISOString().slice(0, 10)
  await env.DB.prepare(
    'INSERT INTO daily_usage_stats (stat_date, user_id, api_key_id, model, request_count, input_tokens, output_tokens, cache_tokens, estimated_cost_micro_usd, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(stat_date, user_id, api_key_id, model) DO UPDATE SET request_count = request_count + 1, input_tokens = input_tokens + excluded.input_tokens, output_tokens = output_tokens + excluded.output_tokens, cache_tokens = cache_tokens + excluded.cache_tokens, estimated_cost_micro_usd = estimated_cost_micro_usd + excluded.estimated_cost_micro_usd, updated_at = CURRENT_TIMESTAMP',
  )
    .bind(
      statDate,
      input.user_id,
      input.api_key_id,
      input.model ?? '',
      input.input_tokens,
      input.output_tokens,
      input.cache_read_tokens + input.cache_write_tokens,
      input.estimated_cost_micro_usd,
    )
    .run()

  await env.DB.prepare(
    'INSERT INTO daily_usage_stats (stat_date, user_id, api_key_id, model, request_count, input_tokens, output_tokens, cache_tokens, estimated_cost_micro_usd, updated_at) VALUES (?, 0, 0, "", 1, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(stat_date, user_id, api_key_id, model) DO UPDATE SET request_count = request_count + 1, input_tokens = input_tokens + excluded.input_tokens, output_tokens = output_tokens + excluded.output_tokens, cache_tokens = cache_tokens + excluded.cache_tokens, estimated_cost_micro_usd = estimated_cost_micro_usd + excluded.estimated_cost_micro_usd, updated_at = CURRENT_TIMESTAMP',
  )
    .bind(
      statDate,
      input.input_tokens,
      input.output_tokens,
      input.cache_read_tokens + input.cache_write_tokens,
      input.estimated_cost_micro_usd,
    )
    .run()
}

