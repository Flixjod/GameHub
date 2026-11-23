let token = localStorage.getItem('gh_token')

export function setToken(t) {
  token = t
  if (t) localStorage.setItem('gh_token', t)
  else localStorage.removeItem('gh_token')
}
export function getToken() {
  return token
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch { /* empty */ }
  if (res.status === 401 && token) setToken(null)
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}
