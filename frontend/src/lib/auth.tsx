import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, clearAuth, errorMessage, loadAuth, persistLogin, saveAuth } from './api'
import type { AuthUser, TwoFactorChallenge } from './types'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  initializing: boolean
  login: (email: string, password: string, tenantId?: string) => Promise<AuthUser | TwoFactorChallenge>
  completeTwoFactorLogin: (mfaToken: string, code: string) => Promise<AuthUser>
  patchUser: (patch: Partial<AuthUser>) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const auth = loadAuth()
    setUser(auth?.user ?? null)
    setInitializing(false)
  }, [])

  const login = useCallback(async (email: string, password: string, tenantId?: string) => {
    try {
      const res = await api.post<
        | { accessToken: string; refreshToken: string; user: AuthUser }
        | TwoFactorChallenge
      >('/auth/login', { email, password, tenantId: tenantId?.trim() || undefined })
      if (res.data && 'requiresTwoFactor' in res.data) return res.data
      const auth = persistLogin(
        res.data as { accessToken: string; refreshToken: string; user: AuthUser },
      )
      setUser(auth.user)
      return auth.user
    } catch (err) {
      throw new Error(errorMessage(err))
    }
  }, [])

  const completeTwoFactorLogin = useCallback(async (mfaToken: string, code: string) => {
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/2fa/login',
        { mfaToken, code: code.trim() },
      )
      const auth = persistLogin(res.data)
      setUser(auth.user)
      return auth.user
    } catch (err) {
      throw new Error(errorMessage(err))
    }
  }, [])

  const patchUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...patch } : prev
      if (next) {
        const stored = loadAuth()
        if (stored) saveAuth({ ...stored, user: next })
      }
      return next
    })
  }, [])

  const logout = useCallback(async () => {
    const auth = loadAuth()
    try {
      if (auth?.sessionId) {
        await api.post('/auth/logout', { sessionId: auth.sessionId })
      }
    } catch {
      // best-effort: session is invalidated locally regardless
    }
    clearAuth()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      initializing,
      login,
      completeTwoFactorLogin,
      patchUser,
      logout,
    }),
    [user, initializing, login, completeTwoFactorLogin, patchUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
