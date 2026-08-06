import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, LogIn, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { homeFor } from '../lib/nav'
import type { TwoFactorChallenge } from '../lib/types'

export default function Login() {
  const { login, completeTwoFactorLogin, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null)
  const [code, setCode] = useState('')
  const [codeBusy, setCodeBusy] = useState(false)

  if (isAuthenticated) {
    return (
      <button onClick={() => navigate(homeFor(user!))} className="text-indigo-600 underline">
        Continue to dashboard
      </button>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await login(email.trim().toLowerCase(), password, tenantId)
      if ('requiresTwoFactor' in result) {
        setChallenge(result)
      } else {
        navigate(homeFor(result), { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    if (!challenge) return
    setError(null)
    setCodeBusy(true)
    try {
      const loggedIn = await completeTwoFactorLogin(challenge.mfaToken, code)
      navigate(homeFor(loggedIn), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setCodeBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <GraduationCap className="h-10 w-10 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">School ERP</h1>
            <p className="text-sm text-slate-500">Sign in to your portal</p>
          </div>
        </div>

        {challenge ? (
          <form
            onSubmit={submitCode}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Two-factor authentication</h2>
                <p className="text-xs text-slate-500">
                  Enter the 6-digit code for <span className="font-medium">{challenge.user.email}</span>
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-700">
                Verification code
              </label>
              <input
                id="code"
                type="text"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-[0.4em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="000000"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Or enter one of your recovery codes (XXXX-XXXX-XXXX).
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={codeBusy || code.length < 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {codeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verify
            </button>

            <button
              type="button"
              onClick={() => {
                setChallenge(null)
                setCode('')
                setError(null)
              }}
              className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="you@school.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              <div className="mt-1.5 text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <label htmlFor="tenantId" className="mb-1 block text-sm font-medium text-slate-700">
                Tenant ID
              </label>
              <input
                id="tenantId"
                type="text"
                autoComplete="off"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Leave blank for SuperAdmin"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Required for school accounts — leave blank to sign in as SuperAdmin.
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign in
            </button>
          </form>
        )}

        {import.meta.env.DEV && (
        <details className="mt-4 rounded-xl border border-slate-200 bg-white/60 p-4 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600">Demo accounts (dev only)</summary>
          <ul className="mt-2 space-y-1">
            <li>
              Owner — <code className="text-indigo-700">owner3@school.com</code> /{' '}
              <code className="text-indigo-700">Owner@123</code> + tenant{' '}
              <code className="text-indigo-700">4b51a390-259b-409f-ba70-ccfb5460af74</code>
            </li>
            <li>
              Principal — <code className="text-indigo-700">ptest3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              Teacher — <code className="text-indigo-700">teacher3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              Student — <code className="text-indigo-700">student3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              Parent — <code className="text-indigo-700">parent3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              Accountant — <code className="text-indigo-700">acc3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              HR — <code className="text-indigo-700">hr3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              Reception — <code className="text-indigo-700">reception3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              Librarian — <code className="text-indigo-700">librarian3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              Transport — <code className="text-indigo-700">transport3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              Hostel — <code className="text-indigo-700">hostel3@school.com</code> /{' '}
              <code className="text-indigo-700">Test@123</code> + same tenant
            </li>
            <li>
              SuperAdmin — <code className="text-indigo-700">admin@erp.com</code> /{' '}
              <code className="text-indigo-700">Admin@123</code> (no tenant ID)
            </li>
          </ul>
          <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-400">
            Tip: login is limited to 5 attempts per minute, and an account locks for 15 minutes
            after 5 failed tries — double-check the tenant ID before submitting.
          </p>
        </details>
        )}
      </div>
    </div>
  )
}
