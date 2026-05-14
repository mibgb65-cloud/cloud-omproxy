import type { Env } from '../types'

export async function writeAudit(
  env: Env,
  input: {
    actorUserId?: number | null
    action: string
    resourceType: string
    resourceId?: string | number | null
    detail?: unknown
    ip?: string | null
    userAgent?: string | null
  },
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, detail_json, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      input.actorUserId ?? null,
      input.action,
      input.resourceType,
      input.resourceId == null ? null : String(input.resourceId),
      input.detail == null ? null : JSON.stringify(input.detail),
      input.ip ?? null,
      input.userAgent ?? null,
    )
    .run()
}

