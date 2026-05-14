import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'
import { fail, getBearerToken } from '../utils/http'
import { verifyJwt } from '../utils/crypto'

export const adminAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getBearerToken(c.req.header('Authorization') ?? null)
  const secret = c.env.JWT_SECRET
  if (!token || !secret) return fail(c, 401, 4011, '登录已失效')

  const payload = await verifyJwt<{ user_id?: number; role?: string }>(token, secret)
  if (!payload?.user_id || payload.role !== 'admin') return fail(c, 401, 4011, '登录已失效')

  const user = await c.env.DB.prepare(
    "SELECT id, email, display_name, role FROM users WHERE id = ? AND role = 'admin' AND status = 'active' AND deleted_at IS NULL",
  )
    .bind(payload.user_id)
    .first<{ id: number; email: string; display_name: string; role: 'admin' }>()

  if (!user) return fail(c, 401, 4011, '登录已失效')
  c.set('adminUser', user)
  await next()
})

