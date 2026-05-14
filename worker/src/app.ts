import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './types'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { gatewayRoutes } from './routes/gateway'
import { initDatabaseRoute, setupRoutes } from './routes/setup'
import { fail } from './utils/http'

export const app = new Hono<AppEnv>()

app.use('*', cors())

app.onError((error, c) => {
  console.error(error)
  if (error instanceof Error && error.message === 'Invalid JSON body') {
    return fail(c, 400, 4000, '请求体不是有效 JSON')
  }
  return fail(c, 500, 5000, error instanceof Error ? error.message : 'Internal Server Error')
})

app.get('/health', (c) => c.json({ status: 'ok' }))
app.get('/init/:token', initDatabaseRoute)
app.get('/api/init/:token', initDatabaseRoute)
app.route('/api/v1/setup', setupRoutes)
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/admin', adminRoutes)
app.route('/', gatewayRoutes)
