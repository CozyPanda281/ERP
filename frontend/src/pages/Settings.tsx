import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Building2, Save } from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

interface TenantRecord {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  country: string | null
  logoUrl: string | null
  status: string
  maxBranches: number | null
  maxUsers: number | null
  maxStudents: number | null
  maxStaff: number | null
  storageLimitMb: number | null
  isActive: boolean
  createdAt?: string | null
}

export default function Settings() {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
  })

  const tenantQuery = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => unwrap<TenantRecord>(api.get(`/tenants/${tenantId}`)),
    enabled: !!tenantId,
  })

  const updateTenant = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<TenantRecord>(api.put(`/tenants/${tenantId}`, body)),
    onSuccess: (data) => {
      queryClient.setQueryData(['tenant', tenantId], data)
      setEditing(false)
      setInfo('Organization details saved')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const tenant = tenantQuery.data

  const startEdit = () => {
    if (!tenant) return
    setForm({
      name: tenant.name ?? '',
      email: tenant.email ?? '',
      phone: tenant.phone ?? '',
      address: tenant.address ?? '',
      city: tenant.city ?? '',
      state: tenant.state ?? '',
      country: tenant.country ?? '',
    })
    setEditing(true)
  }

  const submit = () => {
    setError(null)
    setInfo(null)
    if (!form.name.trim()) {
      setError('Organization name is required')
      return
    }
    const body: Record<string, unknown> = { ...form }
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' && !v.trim()) body[k] = undefined
    }
    updateTenant.mutate(body)
  }

  if (tenantQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Could not load organization settings.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500">Organization profile and plan limits</p>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Save className="h-4 w-4" /> Edit Details
          </button>
        )}
      </div>

      {(error || info) && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            error ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          }`}
        >
          {error ?? info}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{tenant.name}</h3>
              <p className="font-mono text-xs text-slate-500">{tenant.slug}</p>
            </div>
            <span
              className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${
                tenant.isActive && tenant.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-200'
              }`}
            >
              {tenant.status}
            </span>
          </div>

          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Organization name *">
                <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Country">
                <input className={inputCls} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </Field>
              <Field label="Address">
                <input className={inputCls} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input className={inputCls} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                </Field>
                <Field label="State">
                  <input className={inputCls} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
                </Field>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={submit}
                  disabled={updateTenant.isPending}
                  className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateTenant.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Email</dt>
                <dd>{tenant.email ?? '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Phone</dt>
                <dd>{tenant.phone ?? '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 sm:col-span-2">
                <dt className="text-slate-500">Address</dt>
                <dd className="text-right">{ [tenant.address, tenant.city, tenant.state, tenant.pincode, tenant.country].filter(Boolean).join(', ') || '—' }</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Organization ID</dt>
                <dd className="font-mono text-xs">{tenant.id}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Created</dt>
                <dd>{tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '—'}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-900">Plan limits</h4>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Branches" value={tenant.maxBranches != null ? String(tenant.maxBranches) : '∞'} />
            <StatCard label="Users" value={tenant.maxUsers != null ? String(tenant.maxUsers) : '∞'} />
            <StatCard label="Students" value={tenant.maxStudents != null ? String(tenant.maxStudents) : '∞'} />
            <StatCard label="Staff" value={tenant.maxStaff != null ? String(tenant.maxStaff) : '∞'} />
            <div className="col-span-2">
              <StatCard label="Storage" value={tenant.storageLimitMb != null ? `${tenant.storageLimitMb} MB` : 'Unlimited'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
