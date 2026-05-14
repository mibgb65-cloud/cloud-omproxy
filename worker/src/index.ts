import { app } from './app'
import type { Env } from './types'

function shouldRunWorker(pathname: string): boolean {
  return (
    pathname === '/health' ||
    pathname.startsWith('/init/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/v1/') ||
    pathname.startsWith('/v1beta/') ||
    pathname === '/responses' ||
    pathname.startsWith('/responses/') ||
    pathname === '/chat/completions'
  )
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (shouldRunWorker(url.pathname)) {
      return app.fetch(request, env, ctx)
    }
    return env.ASSETS.fetch(request)
  },
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // Reserved for future R2 auto-backups and daily cleanup.
  },
}
