import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import type { AuthUser } from './types'

const STORAGE_KEY = 'erp.auth'

export interface StoredAuth {
  accessToken: string
  refreshToken: string
  user: AuthUser
  sessionId: string | null
}

export function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredAuth) : null
  } catch {
    return null
  }
}

export function saveAuth(auth: StoredAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

function decodeSessionId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.sessionId === 'string' ? payload.sessionId : null
  } catch {
    return null
  }
}

export function persistLogin(data: { accessToken: string; refreshToken: string; user: AuthUser }): StoredAuth {
  const auth: StoredAuth = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
    sessionId: decodeSessionId(data.accessToken),
  }
  saveAuth(auth)
  return auth
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
})

api.interceptors.request.use((config) => {
  const auth = loadAuth()
  if (auth) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
    if (auth.user.tenantId && !config.headers['X-Tenant-Id']) {
      config.headers['X-Tenant-Id'] = auth.user.tenantId
    }
  }
  return config
})

let refreshing: Promise<string> | null = null

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const auth = loadAuth()
    if (error.response?.status === 401 && original && !original._retry && auth?.refreshToken) {
      original._retry = true
      if (!refreshing) {
        refreshing = api
          .post<{ accessToken: string }>('/auth/refresh', { refreshToken: auth.refreshToken })
          .then((res) => res.data.accessToken)
          .finally(() => {
            refreshing = null
          })
      }
      try {
        const token = await refreshing
        saveAuth({ ...auth, accessToken: token })
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch {
        clearAuth()
        if (window.location.pathname !== '/login') window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export function unwrap<T>(promise: Promise<AxiosResponse>): Promise<T> {
  return promise.then((res) => {
    const body = res.data as { success?: boolean; data?: T; message?: string }
    if (body && typeof body === 'object' && body.success === true && 'data' in body) {
      return body.data as T
    }
    return body as T
  })
}

export function unwrapList<T>(res: AxiosResponse): T[] {
  const body = res.data as { data?: T[] | { data?: T[] } } | T[] | undefined
  if (Array.isArray(body)) return body as T[]
  if (body && typeof body === 'object') {
    const inner = (body as { data?: T[] | { data?: T[] } }).data
    if (Array.isArray(inner)) return inner as T[]
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: T[] }).data)) {
      return (inner as { data: T[] }).data
    }
  }
  return []
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { message?: string; errors?: unknown } | undefined
    if (body?.message) return body.message
    if (body?.errors) return JSON.stringify(body.errors)
    return err.message
  }
  return err instanceof Error ? err.message : 'Something went wrong'
}
