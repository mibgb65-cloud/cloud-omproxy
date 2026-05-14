import type { Context } from 'hono'

export function ok<T>(c: Context, data: T) {
  return c.json({ code: 0, data })
}

export function fail(c: Context, status: number, code: number, message: string) {
  return c.json({ code, message }, status as 400)
}

export function getBearerToken(header: string | null): string | null {
  if (!header) return null
  const [scheme, token] = header.split(/\s+/, 2)
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null
  return token
}

export function intParam(value: string | undefined | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function readJson<T>(c: Context): Promise<T> {
  try {
    return (await c.req.json()) as T
  } catch {
    throw new Error('Invalid JSON body')
  }
}
