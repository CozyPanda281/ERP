import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, LogIn, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { homeFor } from '../lib/nav'

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
      const loggedIn = await login(email.trim().toLowerCase(), password, tenantId)
      navigate(homeFor(loggedIn), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
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
              Tenant ID <span className="font-normal text-slate-400">(optional)</span>
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

        <details className="mt-4 rounded-xl border border-slate-200 bg-white/60 p-4 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600">Demo accounts</summary>
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
              SuperAdmin — <code className="text-indigo-700">admin@erp.com</code> /{' '}
              <code className="text-indigo-700">Admin@123</code> (no tenant ID)
            </li>
          </ul>
          <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-400">
            Tip: login is limited to 5 attempts per minute, and an account locks for 15 minutes
            after 5 failed tries — double-check the tenant ID before submitting.
          </p>
        </details>
      </div>
    </div>
  )
}
