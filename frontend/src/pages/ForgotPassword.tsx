import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Loader2, MailCheck, ArrowLeft } from 'lucide-react'
import { api, errorMessage, unwrap } from '../lib/api'

interface ForgotResponse {
  message: string
  devResetLink?: string
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ForgotResponse | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await unwrap<ForgotResponse>(
        api.post('/auth/forgot-password', {
          email: email.trim().toLowerCase(),
          tenantId: tenantId.trim() || undefined,
        }),
      )
      setResult(res)
    } catch (err) {
      setError(errorMessage(err))
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
            <h1 className="text-2xl font-bold text-slate-900">Forgot password</h1>
            <p className="text-sm text-slate-500">We'll send you a reset link</p>
          </div>
        </div>

        {result ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="flex items-start gap-2 text-sm text-slate-700">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {result.message}
            </p>
            {result.devResetLink && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-medium">Dev mode — no SMTP configured</p>
                <p className="mt-1">Use this link to reset now:</p>
                <a
                  href={result.devResetLink}
                  className="mt-1 block break-all text-indigo-700 underline"
                >
                  {result.devResetLink}
                </a>
              </div>
            )}
            <Link
              to="/login"
              className="block rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Back to sign in
            </Link>
          </div>
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
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Send reset link
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
