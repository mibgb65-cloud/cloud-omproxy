import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { adminAuth } from '../middleware/auth'
import { signJwt, verifyPassword } from '../utils/crypto'
import { fail, ok, readJson } from '../utils/http'
import { writeAudit } from '../services/audit'

interface LoginBody {
  email?: string
  password?: string
}

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/login', async (c) => {
  const body = await readJson<LoginBody>(c)
  if (!body.email || !body.password) return fail(c, 400, 4000, '邮箱和密码不能为空')
  if (!c.env.JWT_SECRET) return fail(c, 500, 5000, 'JWT_SECRET 未配置')

  const user = await c.env.DB.prepare(
    "SELECT id, email, display_name, password_hash, role, status FROM users WHERE email = ? AND role = 'admin' AND deleted_at IS NULL",
  )
    .bind(body.email)
    .first<{
      id: number
      email: string
      display_name: string
      password_hash: string
      role: 'admin'
      status: string
    }>()

  if (!user || user.status !== 'active') return fail(c, 401, 4010, '邮箱或密码错误')
  const passwordOk = await verifyPassword(body.password, user.password_hash)
  if (!passwordOk) return fail(c, 401, 4010, '邮箱或密码错误')

  const token = await signJwt({ user_id: user.id, role: 'admin' }, c.env.JWT_SECRET, 60 * 60 * 12)
  await writeAudit(c.env, {
    actorUserId: user.id,
    action: 'auth.login',
    resourceType: 'user',
    resourceId: user.id,
    ip: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  })

  return ok(c, {
    token,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
    },
  })
})

authRoutes.post('/logout', adminAuth, async (c) => {
  const admin = c.get('adminUser')
  await writeAudit(c.env, {
    actorUserId: admin.id,
    action: 'auth.logout',
    resourceType: 'user',
    resourceId: admin.id,
    ip: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  })
  return ok(c, { success: true })
})

authRoutes.get('/me', adminAuth, (c) => {
  return ok(c, c.get('adminUser'))
})

