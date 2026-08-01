import { describe, expect, it, beforeEach } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { clearAuth, errorMessage, loadAuth, persistLogin, unwrap } from './api'
import type { AuthUser } from './types'

const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
  configurable: true,
})

const user: AuthUser = {
  id: 'u1',
  email: 'a@b.com',
  firstName: 'A',
  lastName: 'B',
  roles: ['teacher'],
  permissions: [],
  branchId: null,
}

beforeEach(() => {
  clearAuth()
})

describe('unwrap', () => {
  it('extracts data from the success envelope', async () => {
    const res = { data: { success: true, data: { x: 1 } } }
    await expect(unwrap<{ x: number }>(Promise.resolve(res as any))).resolves.toEqual({ x: 1 })
  })

  it('returns the body as-is when there is no envelope', async () => {
    const res = { data: { x: 1 } }
    await expect(unwrap<{ x: number }>(Promise.resolve(res as any))).resolves.toEqual({ x: 1 })
  })

  it('does not unwrap a non-success body without data', async () => {
    const res = { data: { success: false, message: 'nope' } }
    await expect(unwrap<{ success: boolean }>(Promise.resolve(res as any))).resolves.toEqual({
      success: false,
      message: 'nope',
    })
  })
})

describe('persistLogin / loadAuth', () => {
  it('stores auth and extracts sessionId from the JWT', () => {
    const token = `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ sub: 'u1', sessionId: 'sess-1' }))}.sig`
    persistLogin({ accessToken: token, refreshToken: 'r', user })
    const auth = loadAuth()
    expect(auth?.sessionId).toBe('sess-1')
    expect(auth?.user.email).toBe('a@b.com')
    expect(auth?.accessToken).toBe(token)
  })

  it('handles tokens without a sessionId claim', () => {
    const token = `${btoa('{}')}.${btoa(JSON.stringify({ sub: 'u1' }))}.sig`
    persistLogin({ accessToken: token, refreshToken: 'r', user })
    expect(loadAuth()?.sessionId).toBeNull()
  })

  it('clears stored auth', () => {
    persistLogin({ accessToken: 't', refreshToken: 'r', user })
    clearAuth()
    expect(loadAuth()).toBeNull()
  })
})

describe('errorMessage', () => {
  it('reads the message from an axios error response', () => {
    const err = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: { message: 'Invalid credentials' },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new AxiosHeaders() },
    })
    expect(errorMessage(err)).toBe('Invalid credentials')
  })

  it('stringifies validation errors', () => {
    const err = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: { errors: [{ field: 'email' }] },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new AxiosHeaders() },
    })
    expect(errorMessage(err)).toContain('field')
  })

  it('falls back to the axios message', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK', undefined, undefined, undefined)
    expect(errorMessage(err)).toBe('Network Error')
  })

  it('handles plain errors and unknowns', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage(null)).toBe('Something went wrong')
  })
})
