const encoder = new TextEncoder()

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const b of view) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

export async function hashApiKey(apiKey: string): Promise<string> {
  return sha256Hex(apiKey)
}

export function keyPrefix(apiKey: string): string {
  return apiKey.length <= 14 ? apiKey : apiKey.slice(0, 14)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const iterations = 120000
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations },
    key,
    256,
  )
  return `pbkdf2:${iterations}:${toBase64Url(salt)}:${toBase64Url(bits)}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, iterationsRaw, saltRaw, hashRaw] = storedHash.split(':')
  if (scheme !== 'pbkdf2' || !iterationsRaw || !saltRaw || !hashRaw) return false
  const iterations = Number.parseInt(iterationsRaw, 10)
  const salt = fromBase64Url(saltRaw)
  const expected = fromBase64Url(hashRaw)
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const actual = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations }, key, 256),
  )
  if (actual.byteLength !== expected.byteLength) return false
  let diff = 0
  for (let i = 0; i < actual.byteLength; i += 1) diff |= actual[i] ^ expected[i]
  return diff === 0
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

export async function signJwt(payload: Record<string, unknown>, secret: string, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const body = { ...payload, iat: now, exp: now + ttlSeconds }
  const unsigned = `${toBase64Url(encoder.encode(JSON.stringify(header)))}.${toBase64Url(
    encoder.encode(JSON.stringify(body)),
  )}`
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(unsigned))
  return `${unsigned}.${toBase64Url(signature)}`
}

export async function verifyJwt<T extends Record<string, unknown>>(token: string, secret: string): Promise<T | null> {
  const [header, body, signature] = token.split('.')
  if (!header || !body || !signature) return null
  const unsigned = `${header}.${body}`
  const ok = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    toArrayBuffer(fromBase64Url(signature)),
    encoder.encode(unsigned),
  )
  if (!ok) return null
  const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as T & { exp?: number }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(plainText: string, secret: string): Promise<string> {
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), encoder.encode(plainText))
  return `aesgcm:${toBase64Url(iv)}:${toBase64Url(cipher)}`
}

export async function decryptSecret(cipherText: string, secret: string): Promise<string> {
  const [scheme, ivRaw, payloadRaw] = cipherText.split(':')
  if (scheme !== 'aesgcm' || !ivRaw || !payloadRaw) throw new Error('Invalid credential format')
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(fromBase64Url(ivRaw)) },
    await aesKey(secret),
    toArrayBuffer(fromBase64Url(payloadRaw)),
  )
  return new TextDecoder().decode(plain)
}
