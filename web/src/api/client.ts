import { useAuthStore } from '@/stores/auth'

interface ApiEnvelope<T> {
  code: number
  data?: T
  message?: string
}

function queryString(params?: Record<string, unknown>) {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = useAuthStore()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (auth.token) headers.set('Authorization', `Bearer ${auth.token}`)

  const response = await fetch(path, { ...init, headers })
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>
  if (!response.ok || payload.code !== 0) {
    if (response.status === 401) auth.clear()
    throw new Error(payload.message || `HTTP ${response.status}`)
  }
  return payload.data as T
}

export const api = {
  get<T>(path: string, params?: Record<string, unknown>) {
    return apiRequest<T>(`${path}${queryString(params)}`)
  },
  post<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, { method: 'POST', body: body == null ? undefined : JSON.stringify(body) })
  },
  put<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, { method: 'PUT', body: body == null ? undefined : JSON.stringify(body) })
  },
  delete<T>(path: string) {
    return apiRequest<T>(path, { method: 'DELETE' })
  },
}

