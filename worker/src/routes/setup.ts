import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { hashPassword } from '../utils/crypto'
import { fail, getBearerToken, ok, readJson } from '../utils/http'
import { writeAudit } from '../services/audit'

interface BootstrapBody {
  email?: string
  display_name?: string
  password?: string
}

export const setupRoutes = new Hono<AppEnv>()

setupRoutes.post('/bootstrap-admin', async (c) => {
  const token = getBearerToken(c.req.header('Authorization') ?? null)
  if (!c.env.ADMIN_BOOTSTRAP_TOKEN || token !== c.env.ADMIN_BOOTSTRAP_TOKEN) {
    return fail(c, 401, 4010, 'Bootstrap token 无效')
  }

  const count = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND deleted_at IS NULL")
    .first<{ count: number }>()
  if ((count?.count ?? 0) > 0) return fail(c, 409, 4090, '管理员已存在')

  const body = await readJson<BootstrapBody>(c)
  if (!body.email || !body.display_name || !body.password) {
    return fail(c, 400, 4000, 'email、display_name、password 不能为空')
  }

  const passwordHash = await hashPassword(body.password)
  const result = await c.env.DB.prepare(
    "INSERT INTO users (email, display_name, password_hash, role, status) VALUES (?, ?, ?, 'admin', 'active')",
  )
    .bind(body.email, body.display_name, passwordHash)
    .run()
  const id = Number(result.meta.last_row_id)
  await writeAudit(c.env, {
    actorUserId: id,
    action: 'setup.bootstrap_admin',
    resourceType: 'user',
    resourceId: id,
    ip: c.req.header('CF-Connecting-IP') ?? null,
    userAgent: c.req.header('User-Agent') ?? null,
  })

  return ok(c, { id, email: body.email, display_name: body.display_name, role: 'admin' })
})

