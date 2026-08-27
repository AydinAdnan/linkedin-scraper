const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
// NOTE: a build-time env var ends up readable in the shipped JS bundle, so
// this only deters casual/automated hits directly on the API — it is not a
// real secret. See README "known limitations".
const API_KEY = import.meta.env.VITE_API_KEY || ''
const authHeaders = API_KEY ? { 'x-api-key': API_KEY } : {}

export class SessionExpiredError extends Error {}

// Carries the machine-readable error code (PROFILE_NOT_FOUND, PROFILE_RESTRICTED, ...)
// so callers can branch on it instead of parsing message text.
export class ApiError extends Error {
  constructor(code, message) {
    super(message || code)
    this.code = code
  }
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) throw new SessionExpiredError(data.error || 'Session expired')
  if (!res.ok) throw new ApiError(data.error, data.detail || data.error || data.message || `Request failed (${res.status})`)
  return data
}

export const fetchProfile = (url) => post('/api/profile', { url })

// Streams NDJSON from POST /api/profile/batch, calling onRow(row) as each
// line arrives. `input` is either { file } (multipart upload, backend parses
// the csv/txt) or { urls } (JSON array).
export async function streamBatch(input, onRow) {
  const opts = input.file
    ? { method: 'POST', headers: authHeaders, body: (() => {
        const fd = new FormData()
        fd.append('file', input.file)
        return fd
      })() }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ urls: input.urls }),
      }

  const res = await fetch(BASE + '/api/profile/batch', opts)
  if (res.status === 401) throw new SessionExpiredError('Session expired')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || data.error || `Request failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (line) onRow(JSON.parse(line))
    }
  }
  const rest = buf.trim()
  if (rest) onRow(JSON.parse(rest))
}

export async function authStatus() {
  const res = await fetch(BASE + '/auth/status')
  return res.json()
}
