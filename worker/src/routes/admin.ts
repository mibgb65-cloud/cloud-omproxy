import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../types'
import { adminAuth } from '../middleware/auth'
import { encryptSecret, hashApiKey, hashPassword, keyPrefix, randomToken, sha256Hex } from '../utils/crypto'
import { fail, intParam, ok, readJson, today } from '../utils/http'
import { writeAudit } from '../services/audit'

export const adminRoutes = new Hono<AppEnv>()
adminRoutes.use('*', adminAuth)

type SqlValue = string | number | null

async function clearApiKeyCache(env: AppEnv['Bindings'], keyHash: string) {
  await env.API_KEY_CACHE.delete(`api-key:${keyHash}`)
}

function pagination(c: Context<AppEnv>) {
  const page = intParam(c.req.query('page'), 1)
  const pageSize = Math.min(intParam(c.req.query('page_size'), 20), 100)
  return { page, pageSize, offset: (page - 1) * pageSize }
}

async function listWithCount<T>(env: AppEnv['Bindings'], sql: string, countSql: string, params: SqlValue[], page: number, pageSize: number, offset: number) {
  const items = (await env.DB.prepare(`${sql} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all<T>()).results ?? []
  const count = await env.DB.prepare(countSql).bind(...params).first<{ total: number }>()
  return { items, total: count?.total ?? 0, page, page_size: pageSize }
}

adminRoutes.get('/dashboard/summary', async (c) => {
  const statDate = c.req.query('date') || today()
  const stats = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(request_count), 0) AS request_count, COALESCE(SUM(input_tokens + output_tokens + cache_tokens), 0) AS total_tokens, COALESCE(SUM(estimated_cost_micro_usd), 0) AS estimated_cost_micro_usd FROM daily_usage_stats WHERE stat_date = ?",
  )
    .bind(statDate)
    .first<{ request_count: number; total_tokens: number; estimated_cost_micro_usd: number }>()
  const activeUsers = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'active' AND deleted_at IS NULL").first<{ count: number }>()
  const activeKeys = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM api_keys WHERE status = 'active' AND deleted_at IS NULL").first<{ count: number }>()
  const activeAccounts = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM upstream_accounts WHERE status = 'active' AND deleted_at IS NULL").first<{ count: number }>()
  const recentLogs = (await c.env.DB.prepare('SELECT * FROM usage_logs ORDER BY created_at DESC LIMIT 10').all()).results ?? []

  return ok(c, {
    request_count: stats?.request_count ?? 0,
    total_tokens: stats?.total_tokens ?? 0,
    estimated_cost_micro_usd: stats?.estimated_cost_micro_usd ?? 0,
    active_users: activeUsers?.count ?? 0,
    active_api_keys: activeKeys?.count ?? 0,
    active_upstream_accounts: activeAccounts?.count ?? 0,
    recent_logs: recentLogs,
  })
})

adminRoutes.get('/users', async (c) => {
  const { page, pageSize, offset } = pagination(c)
  const where = ['deleted_at IS NULL']
  const params: SqlValue[] = []
  const keyword = c.req.query('keyword')
  if (keyword) {
    where.push('(email LIKE ? OR display_name LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  for (const field of ['status', 'role']) {
    const value = c.req.query(field)
    if (value) {
      where.push(`${field} = ?`)
      params.push(value)
    }
  }
  const clause = where.join(' AND ')
  return ok(
    c,
    await listWithCount(
      c.env,
      `SELECT id, email, display_name, role, status, daily_request_limit, daily_cost_limit_micro_usd, created_at, updated_at FROM users WHERE ${clause} ORDER BY id DESC`,
      `SELECT COUNT(*) AS total FROM users WHERE ${clause}`,
      params,
      page,
      pageSize,
      offset,
    ),
  )
})

adminRoutes.post('/users', async (c) => {
  const body = await readJson<Record<string, unknown>>(c)
  const email = String(body.email || '').trim()
  const displayName = String(body.display_name || '').trim()
  const role = String(body.role || 'member')
  const password = String(body.password || '')
  if (!email || !displayName) return fail(c, 400, 4000, '邮箱和昵称不能为空')
  if (!['admin', 'member'].includes(role)) return fail(c, 400, 4000, '角色不正确')
  if (role === 'admin' && !password) return fail(c, 400, 4000, '管理员密码不能为空')
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').bind(email).first()
  if (exists) return fail(c, 409, 4090, '邮箱已存在')
  const passwordHash = password ? await hashPassword(password) : ''
  const result = await c.env.DB.prepare(
    'INSERT INTO users (email, display_name, password_hash, role, status, daily_request_limit, daily_cost_limit_micro_usd) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      email,
      displayName,
      passwordHash,
      role,
      String(body.status || 'active'),
      body.daily_request_limit == null ? null : Number(body.daily_request_limit),
      body.daily_cost_limit_micro_usd == null ? null : Number(body.daily_cost_limit_micro_usd),
    )
    .run()
  const id = Number(result.meta.last_row_id)
  const admin = c.get('adminUser')
  await writeAudit(c.env, { actorUserId: admin.id, action: 'user.create', resourceType: 'user', resourceId: id })
  return ok(c, { id, email, display_name: displayName, role, status: body.status || 'active' })
})

adminRoutes.put('/users/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').bind(id).first<{ password_hash: string }>()
  if (!existing) return fail(c, 404, 4040, '用户不存在')
  const body = await readJson<Record<string, unknown>>(c)
  const fields: string[] = []
  const params: SqlValue[] = []
  for (const field of ['display_name', 'role', 'status']) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`)
      params.push(String(body[field]))
    }
  }
  if (body.daily_request_limit !== undefined) {
    fields.push('daily_request_limit = ?')
    params.push(body.daily_request_limit == null ? null : Number(body.daily_request_limit))
  }
  if (body.daily_cost_limit_micro_usd !== undefined) {
    fields.push('daily_cost_limit_micro_usd = ?')
    params.push(body.daily_cost_limit_micro_usd == null ? null : Number(body.daily_cost_limit_micro_usd))
  }
  if (body.password) {
    fields.push('password_hash = ?')
    params.push(await hashPassword(String(body.password)))
  }
  if (!fields.length) return ok(c, { id, success: true })
  fields.push('updated_at = CURRENT_TIMESTAMP')
  await c.env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...params, id).run()
  if (body.status === 'disabled') {
    const keys = (await c.env.DB.prepare('SELECT key_hash FROM api_keys WHERE user_id = ? AND deleted_at IS NULL').bind(id).all<{ key_hash: string }>()).results ?? []
    await Promise.all(keys.map((key) => clearApiKeyCache(c.env, key.key_hash)))
  }
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'user.update', resourceType: 'user', resourceId: id })
  return ok(c, { id, success: true })
})

adminRoutes.delete('/users/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (id === c.get('adminUser').id) return fail(c, 409, 4091, '不能删除当前登录管理员')
  const keys = (await c.env.DB.prepare('SELECT key_hash FROM api_keys WHERE user_id = ? AND deleted_at IS NULL').bind(id).all<{ key_hash: string }>()).results ?? []
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET deleted_at = CURRENT_TIMESTAMP, status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
    c.env.DB.prepare("UPDATE api_keys SET status = 'disabled', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").bind(id),
  ])
  await Promise.all(keys.map((key) => clearApiKeyCache(c.env, key.key_hash)))
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'user.delete', resourceType: 'user', resourceId: id })
  return ok(c, { success: true })
})

adminRoutes.get('/groups', async (c) => {
  const params: SqlValue[] = []
  const where = ['deleted_at IS NULL']
  const status = c.req.query('status')
  if (status) {
    where.push('status = ?')
    params.push(status)
  }
  const results = (await c.env.DB.prepare(`SELECT * FROM groups WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, id ASC`).bind(...params).all()).results ?? []
  return ok(c, results)
})

adminRoutes.post('/groups', async (c) => {
  const body = await readJson<Record<string, unknown>>(c)
  const name = String(body.name || '').trim()
  if (!name) return fail(c, 400, 4000, '分组名称不能为空')
  const result = await c.env.DB.prepare(
    'INSERT INTO groups (name, description, default_platform, status, sort_order) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(name, body.description ?? null, body.default_platform ?? null, body.status ?? 'active', Number(body.sort_order ?? 100))
    .run()
  const id = Number(result.meta.last_row_id)
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'group.create', resourceType: 'group', resourceId: id })
  return ok(c, { id, name, status: body.status ?? 'active' })
})

adminRoutes.put('/groups/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await readJson<Record<string, unknown>>(c)
  const fields: string[] = []
  const params: SqlValue[] = []
  for (const field of ['name', 'description', 'default_platform', 'status', 'sort_order']) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`)
      params.push(field === 'sort_order' ? Number(body[field]) : (body[field] as SqlValue))
    }
  }
  if (!fields.length) return ok(c, { id, success: true })
  fields.push('updated_at = CURRENT_TIMESTAMP')
  await c.env.DB.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`).bind(...params, id).run()
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'group.update', resourceType: 'group', resourceId: id })
  return ok(c, { id, success: true })
})

adminRoutes.delete('/groups/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const keyCount = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM api_keys WHERE group_id = ? AND deleted_at IS NULL').bind(id).first<{ count: number }>()
  const acctCount = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM account_groups WHERE group_id = ?').bind(id).first<{ count: number }>()
  if ((keyCount?.count ?? 0) > 0 || (acctCount?.count ?? 0) > 0) return fail(c, 409, 4090, '分组仍被 API Key 或账号使用')
  await c.env.DB.prepare("UPDATE groups SET deleted_at = CURRENT_TIMESTAMP, status = 'disabled' WHERE id = ?").bind(id).run()
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'group.delete', resourceType: 'group', resourceId: id })
  return ok(c, { success: true })
})

adminRoutes.get('/api-keys', async (c) => {
  const { page, pageSize, offset } = pagination(c)
  const where = ['k.deleted_at IS NULL']
  const params: SqlValue[] = []
  for (const field of ['user_id', 'group_id', 'status']) {
    const value = c.req.query(field)
    if (value) {
      where.push(`k.${field} = ?`)
      params.push(field.endsWith('_id') ? Number(value) : value)
    }
  }
  const clause = where.join(' AND ')
  return ok(
    c,
    await listWithCount(
      c.env,
      `SELECT k.id, k.user_id, u.display_name AS user_name, k.group_id, g.name AS group_name, k.name, k.key_prefix, k.status, k.last_used_at, k.expires_at, k.created_at FROM api_keys k LEFT JOIN users u ON u.id = k.user_id LEFT JOIN groups g ON g.id = k.group_id WHERE ${clause} ORDER BY k.id DESC`,
      `SELECT COUNT(*) AS total FROM api_keys k WHERE ${clause}`,
      params,
      page,
      pageSize,
      offset,
    ),
  )
})

adminRoutes.post('/api-keys', async (c) => {
  const body = await readJson<Record<string, unknown>>(c)
  const userId = Number(body.user_id)
  const name = String(body.name || '').trim()
  if (!userId || !name) return fail(c, 400, 4000, '用户和名称不能为空')
  const apiKey = `sk-pfg-${randomToken(32)}`
  const keyHash = await hashApiKey(apiKey)
  const result = await c.env.DB.prepare(
    "INSERT INTO api_keys (user_id, group_id, name, key_hash, key_prefix, status, expires_at) VALUES (?, ?, ?, ?, ?, 'active', ?)",
  )
    .bind(userId, body.group_id == null ? null : Number(body.group_id), name, keyHash, keyPrefix(apiKey), body.expires_at ?? null)
    .run()
  const id = Number(result.meta.last_row_id)
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'api_key.create', resourceType: 'api_key', resourceId: id })
  return ok(c, { id, api_key: apiKey, key_prefix: keyPrefix(apiKey) })
})

adminRoutes.put('/api-keys/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT key_hash FROM api_keys WHERE id = ? AND deleted_at IS NULL').bind(id).first<{ key_hash: string }>()
  if (!existing) return fail(c, 404, 4040, 'API Key 不存在')
  const body = await readJson<Record<string, unknown>>(c)
  const fields: string[] = []
  const params: SqlValue[] = []
  for (const field of ['name', 'group_id', 'status', 'expires_at']) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`)
      params.push(field === 'group_id' && body[field] != null ? Number(body[field]) : (body[field] as SqlValue))
    }
  }
  if (fields.length) {
    fields.push('updated_at = CURRENT_TIMESTAMP')
    await c.env.DB.prepare(`UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`).bind(...params, id).run()
  }
  await clearApiKeyCache(c.env, existing.key_hash)
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'api_key.update', resourceType: 'api_key', resourceId: id })
  return ok(c, { id, success: true })
})

adminRoutes.delete('/api-keys/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT key_hash FROM api_keys WHERE id = ? AND deleted_at IS NULL').bind(id).first<{ key_hash: string }>()
  if (!existing) return fail(c, 404, 4040, 'API Key 不存在')
  await c.env.DB.prepare("UPDATE api_keys SET status = 'disabled', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run()
  await clearApiKeyCache(c.env, existing.key_hash)
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'api_key.delete', resourceType: 'api_key', resourceId: id })
  return ok(c, { success: true })
})

adminRoutes.get('/upstream-accounts', async (c) => {
  const { page, pageSize, offset } = pagination(c)
  const where = ['a.deleted_at IS NULL']
  const params: SqlValue[] = []
  for (const field of ['platform', 'status']) {
    const value = c.req.query(field)
    if (value) {
      where.push(`a.${field} = ?`)
      params.push(value)
    }
  }
  const groupId = c.req.query('group_id')
  if (groupId) {
    where.push('EXISTS (SELECT 1 FROM account_groups ag WHERE ag.account_id = a.id AND ag.group_id = ?)')
    params.push(Number(groupId))
  }
  const clause = where.join(' AND ')
  const data = await listWithCount<Record<string, unknown>>(
    c.env,
    `SELECT a.id, a.name, a.platform, a.auth_type, a.base_url, a.priority, a.status, a.cooldown_until, a.failure_count, a.last_error_message, a.last_used_at, a.created_at FROM upstream_accounts a WHERE ${clause} ORDER BY a.priority ASC, a.id DESC`,
    `SELECT COUNT(*) AS total FROM upstream_accounts a WHERE ${clause}`,
    params,
    page,
    pageSize,
    offset,
  )
  return ok(c, data)
})

adminRoutes.post('/upstream-accounts', async (c) => {
  if (!c.env.CREDENTIAL_SECRET) return fail(c, 500, 5000, 'CREDENTIAL_SECRET 未配置')
  const body = await readJson<Record<string, unknown>>(c)
  const name = String(body.name || '').trim()
  const platform = String(body.platform || '')
  const credential = String(body.credential || '')
  if (!name || !['anthropic', 'openai', 'gemini'].includes(platform) || !credential) {
    return fail(c, 400, 4000, '上游账号参数不完整')
  }
  const cipher = await encryptSecret(credential, c.env.CREDENTIAL_SECRET)
  const result = await c.env.DB.prepare(
    "INSERT INTO upstream_accounts (name, platform, auth_type, credential_ciphertext, base_url, priority, status) VALUES (?, ?, 'api_key', ?, ?, ?, ?)",
  )
    .bind(name, platform, cipher, body.base_url ?? null, Number(body.priority ?? 100), body.status ?? 'active')
    .run()
  const id = Number(result.meta.last_row_id)
  const groupIds = Array.isArray(body.group_ids) ? body.group_ids.map(Number).filter(Boolean) : []
  if (groupIds.length) {
    await c.env.DB.batch(groupIds.map((groupId) => c.env.DB.prepare('INSERT OR IGNORE INTO account_groups (account_id, group_id) VALUES (?, ?)').bind(id, groupId)))
  }
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'upstream_account.create', resourceType: 'upstream_account', resourceId: id })
  return ok(c, { id, name, platform, status: body.status ?? 'active' })
})

adminRoutes.put('/upstream-accounts/:id', async (c) => {
  if (!c.env.CREDENTIAL_SECRET) return fail(c, 500, 5000, 'CREDENTIAL_SECRET 未配置')
  const id = Number(c.req.param('id'))
  const exists = await c.env.DB.prepare('SELECT id FROM upstream_accounts WHERE id = ? AND deleted_at IS NULL').bind(id).first()
  if (!exists) return fail(c, 404, 4040, '上游账号不存在')
  const body = await readJson<Record<string, unknown>>(c)
  const fields: string[] = []
  const params: SqlValue[] = []
  for (const field of ['name', 'base_url', 'priority', 'status']) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`)
      params.push(field === 'priority' ? Number(body[field]) : (body[field] as SqlValue))
    }
  }
  if (body.credential) {
    fields.push('credential_ciphertext = ?')
    params.push(await encryptSecret(String(body.credential), c.env.CREDENTIAL_SECRET))
  }
  if (fields.length) {
    fields.push('updated_at = CURRENT_TIMESTAMP')
    await c.env.DB.prepare(`UPDATE upstream_accounts SET ${fields.join(', ')} WHERE id = ?`).bind(...params, id).run()
  }
  if (Array.isArray(body.group_ids)) {
    const groupIds = body.group_ids.map(Number).filter(Boolean)
    await c.env.DB.prepare('DELETE FROM account_groups WHERE account_id = ?').bind(id).run()
    if (groupIds.length) {
      await c.env.DB.batch(groupIds.map((groupId) => c.env.DB.prepare('INSERT OR IGNORE INTO account_groups (account_id, group_id) VALUES (?, ?)').bind(id, groupId)))
    }
  }
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'upstream_account.update', resourceType: 'upstream_account', resourceId: id })
  return ok(c, { id, success: true })
})

adminRoutes.delete('/upstream-accounts/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE upstream_accounts SET status = 'disabled', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
    c.env.DB.prepare('DELETE FROM account_groups WHERE account_id = ?').bind(id),
  ])
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'upstream_account.delete', resourceType: 'upstream_account', resourceId: id })
  return ok(c, { success: true })
})

adminRoutes.post('/upstream-accounts/:id/test', async (c) => {
  const id = Number(c.req.param('id'))
  const account = await c.env.DB.prepare('SELECT id FROM upstream_accounts WHERE id = ? AND deleted_at IS NULL').bind(id).first()
  if (!account) return fail(c, 404, 4040, '上游账号不存在')
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'upstream_account.test', resourceType: 'upstream_account', resourceId: id })
  return ok(c, { success: true, latency_ms: 0, message: '账号存在；真实上游测试会在网关实现中使用同一凭证路径' })
})

adminRoutes.get('/usage-logs', async (c) => {
  const { page, pageSize, offset } = pagination(c)
  const where = ['1 = 1']
  const params: SqlValue[] = []
  for (const field of ['user_id', 'api_key_id', 'platform', 'model']) {
    const value = c.req.query(field)
    if (value) {
      where.push(`${field} = ?`)
      params.push(field.endsWith('_id') ? Number(value) : value)
    }
  }
  const start = c.req.query('start_time')
  const end = c.req.query('end_time')
  if (start) {
    where.push('created_at >= ?')
    params.push(start)
  }
  if (end) {
    where.push('created_at <= ?')
    params.push(end)
  }
  const clause = where.join(' AND ')
  return ok(
    c,
    await listWithCount(
      c.env,
      `SELECT * FROM usage_logs WHERE ${clause} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS total FROM usage_logs WHERE ${clause}`,
      params,
      page,
      pageSize,
      offset,
    ),
  )
})

adminRoutes.get('/usage-stats', async (c) => {
  const startDate = c.req.query('start_date') || today()
  const endDate = c.req.query('end_date') || startDate
  const dimension = c.req.query('dimension') || 'day'
  const labelExpr =
    dimension === 'user' ? "CAST(user_id AS TEXT)" : dimension === 'model' ? "COALESCE(NULLIF(model, ''), 'unknown')" : 'stat_date'
  const rows = (await c.env.DB.prepare(
    `SELECT ${labelExpr} AS label, SUM(request_count) AS request_count, SUM(input_tokens + output_tokens + cache_tokens) AS total_tokens, SUM(estimated_cost_micro_usd) AS estimated_cost_micro_usd FROM daily_usage_stats WHERE stat_date >= ? AND stat_date <= ? GROUP BY label ORDER BY label ASC`,
  )
    .bind(startDate, endDate)
    .all()).results ?? []
  return ok(c, { dimension, items: rows })
})

adminRoutes.get('/settings', async (c) => {
  const rows = (await c.env.DB.prepare('SELECT key, value_json, is_secret FROM settings').all<{ key: string; value_json: string; is_secret: number }>()).results ?? []
  const data: Record<string, unknown> = {}
  for (const row of rows) {
    data[row.key] = row.is_secret ? '******' : JSON.parse(row.value_json)
  }
  return ok(c, data)
})

adminRoutes.put('/settings', async (c) => {
  const body = await readJson<Record<string, unknown>>(c)
  const statements = Object.entries(body).map(([key, value]) =>
    c.env.DB.prepare(
      'INSERT INTO settings (key, value_json, updated_by_user_id) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_by_user_id = excluded.updated_by_user_id, updated_at = CURRENT_TIMESTAMP',
    ).bind(key, JSON.stringify(value), c.get('adminUser').id),
  )
  if (statements.length) await c.env.DB.batch(statements)
  await c.env.SETTINGS_CACHE.delete('settings:all')
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'settings.update', resourceType: 'settings' })
  return ok(c, { success: true })
})

adminRoutes.get('/model-prices', async (c) => {
  const where = ['1 = 1']
  const params: SqlValue[] = []
  for (const field of ['platform', 'status']) {
    const value = c.req.query(field)
    if (value) {
      where.push(`${field} = ?`)
      params.push(value)
    }
  }
  const rows = (await c.env.DB.prepare(`SELECT * FROM model_prices WHERE ${where.join(' AND ')} ORDER BY platform ASC, model ASC`).bind(...params).all()).results ?? []
  return ok(c, rows)
})

adminRoutes.put('/model-prices/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await readJson<Record<string, unknown>>(c)
  await c.env.DB.prepare(
    'UPDATE model_prices SET input_price_micro_usd_per_token = ?, output_price_micro_usd_per_token = ?, cache_read_price_micro_usd_per_token = ?, cache_write_price_micro_usd_per_token = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  )
    .bind(
      Number(body.input_price_micro_usd_per_token ?? 0),
      Number(body.output_price_micro_usd_per_token ?? 0),
      Number(body.cache_read_price_micro_usd_per_token ?? 0),
      Number(body.cache_write_price_micro_usd_per_token ?? 0),
      String(body.status ?? 'active'),
      id,
    )
    .run()
  await writeAudit(c.env, { actorUserId: c.get('adminUser').id, action: 'model_price.update', resourceType: 'model_price', resourceId: id })
  return ok(c, { id, success: true })
})

adminRoutes.post('/backups', async (c) => {
  const admin = c.get('adminUser')
  const objectKey = `manual/backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const fileName = objectKey.split('/').pop() ?? 'backup.json'
  const pending = await c.env.DB.prepare(
    "INSERT INTO backups (backup_type, object_key, file_name, status, created_by_user_id) VALUES ('manual', ?, ?, 'pending', ?)",
  )
    .bind(objectKey, fileName, admin.id)
    .run()
  const id = Number(pending.meta.last_row_id)
  try {
    const tables = ['users', 'groups', 'api_keys', 'upstream_accounts', 'account_groups', 'model_prices', 'settings']
    const payload: Record<string, unknown> = { created_at: new Date().toISOString(), tables: {} }
    for (const table of tables) {
      ;(payload.tables as Record<string, unknown>)[table] = (await c.env.DB.prepare(`SELECT * FROM ${table}`).all()).results ?? []
    }
    const json = JSON.stringify(payload, null, 2)
    const checksum = await sha256Hex(json)
    await c.env.BACKUPS.put(objectKey, json, { httpMetadata: { contentType: 'application/json' } })
    await c.env.DB.prepare(
      "UPDATE backups SET status = 'completed', file_size = ?, checksum_sha256 = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
      .bind(new TextEncoder().encode(json).byteLength, checksum, id)
      .run()
    await writeAudit(c.env, { actorUserId: admin.id, action: 'backup.create', resourceType: 'backup', resourceId: id })
    return ok(c, { id, status: 'completed', file_name: fileName })
  } catch (error) {
    await c.env.DB.prepare("UPDATE backups SET status = 'failed', error_message = ? WHERE id = ?")
      .bind(error instanceof Error ? error.message : String(error), id)
      .run()
    return fail(c, 500, 5001, '备份上传失败')
  }
})

adminRoutes.get('/backups', async (c) => {
  const { page, pageSize, offset } = pagination(c)
  return ok(
    c,
    await listWithCount(
      c.env,
      'SELECT * FROM backups ORDER BY created_at DESC',
      'SELECT COUNT(*) AS total FROM backups',
      [],
      page,
      pageSize,
      offset,
    ),
  )
})

adminRoutes.get('/backups/:id/download-url', async (c) => {
  const id = Number(c.req.param('id'))
  const backup = await c.env.DB.prepare("SELECT id FROM backups WHERE id = ? AND status = 'completed'").bind(id).first()
  if (!backup) return fail(c, 404, 4040, '备份文件不存在')
  return ok(c, { download_url: `/api/v1/admin/backups/${id}/download`, expires_in: 300 })
})

adminRoutes.get('/backups/:id/download', async (c) => {
  const id = Number(c.req.param('id'))
  const backup = await c.env.DB.prepare("SELECT object_key, file_name FROM backups WHERE id = ? AND status = 'completed'")
    .bind(id)
    .first<{ object_key: string; file_name: string }>()
  if (!backup) return fail(c, 404, 4040, '备份文件不存在')
  const object = await c.env.BACKUPS.get(backup.object_key)
  if (!object) return fail(c, 404, 4040, '备份文件不存在')
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/json',
      'Content-Disposition': `attachment; filename="${backup.file_name}"`,
    },
  })
})
