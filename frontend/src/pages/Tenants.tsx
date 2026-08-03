import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Building2, Eye } from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

function Badge({ children, tone = 'indigo' }: { children: React.ReactNode; tone?: 'indigo' | 'green' | 'slate' | 'red' | 'amber' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className={`my-8 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-xl bg-white p-6 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}

interface Tenant {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  status: string | null
  isActive: boolean | null
  createdAt: string | null
}

interface Plan {
  id: string
  name: string
  code: string
  priceMonthly: string | null
  priceYearly: string | null
  maxBranches: number | null
  maxUsers: number | null
  maxStudents: number | null
  maxStaff: number | null
  isActive: boolean | null
}

interface TenantStats {
  total?: number
  active?: number
  trial?: number
  [key: string]: unknown
}

const EMPTY = {
  name: '',
  slug: '',
  email: '',
  phone: '',
  planId: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerPassword: '',
}

export default function Tenants() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Tenant | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  const listQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/tenants', { params: { page: 1, limit: 100 } }),
  })
  const tenants = (listQuery.data?.data?.data ?? []) as Tenant[]

  const statsQuery = useQuery({
    queryKey: ['tenant-stats'],
    queryFn: () => api.get('/tenants/stats'),
  })
  const stats = (statsQuery.data?.data?.data ?? {}) as TenantStats

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/subscriptions/plans'),
  })
  const plans = (plansQuery.data?.data?.data ?? []) as Plan[]

  const detailQuery = useQuery({
    queryKey: ['tenant-detail', detail?.id],
    queryFn: () => api.get(`/tenants/${detail!.id}`),
    enabled: !!detail,
  })
  const detailData = detailQuery.data?.data?.data as (Tenant & { maxStudents?: number | null }) | undefined

  const createTenant = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/tenants', {
          name: form.name,
          slug: form.slug,
          email: form.email || undefined,
          phone: form.phone || undefined,
          planId: form.planId,
          ownerFirstName: form.ownerFirstName,
          ownerLastName: form.ownerLastName,
          ownerEmail: form.ownerEmail,
          ownerPassword: form.ownerPassword,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-stats'] })
      setOpen(false)
      setForm({ ...EMPTY })
      setInfo('Tenant created')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
      {info && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">{info}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Tenants</h1>
          <p className="text-sm text-slate-500">Organizations on the platform</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> New Tenant
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{stats.total ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Active</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.active ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Trial</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">{stats.trial ?? '—'}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-indigo-500" />
                    <span className="font-medium text-slate-800">{t.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.slug}</td>
                <td className="px-4 py-3 text-slate-600">{t.email ?? '—'}</td>
                <td className="px-4 py-3"><Badge tone={t.isActive === false ? 'red' : t.status === 'trial' ? 'amber' : 'green'}>{t.status ?? '—'}</Badge></td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDetail(t)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    <Eye size={13} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="New Tenant" onClose={() => setOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createTenant.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Organization Name" required>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug" required>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g. springfield-elem"
                className={inputCls}
              />
            </Field>
            <Field label="Plan" required>
              <select
                required
                value={form.planId}
                onChange={(e) => setForm({ ...form, planId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select plan</option>
                {plans.filter((p) => p.isActive !== false).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Admin Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Owner Account</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required>
                <input
                  required
                  value={form.ownerFirstName}
                  onChange={(e) => setForm({ ...form, ownerFirstName: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Last Name" required>
                <input
                  required
                  value={form.ownerLastName}
                  onChange={(e) => setForm({ ...form, ownerLastName: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Owner Email" required>
                <input
                  required
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Password" required>
                <input
                  required
                  type="password"
                  value={form.ownerPassword}
                  onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                  placeholder="Min 8 chars"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Create Tenant
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} title="Tenant Details" onClose={() => setDetail(null)} wide>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-indigo-500" />
            <span className="font-semibold text-slate-900">{detailData?.name ?? detail?.name}</span>
            <Badge tone={detailData?.isActive === false ? 'red' : detailData?.status === 'trial' ? 'amber' : 'green'}>
              {detailData?.status ?? detail?.status ?? '—'}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-slate-500">Slug</div>
            <div className="font-mono text-xs text-slate-800">{detailData?.slug ?? detail?.slug}</div>
            <div className="text-slate-500">Email</div>
            <div className="text-slate-800">{detailData?.email ?? detail?.email ?? '—'}</div>
            <div className="text-slate-500">Phone</div>
            <div className="text-slate-800">{detailData?.phone ?? detail?.phone ?? '—'}</div>
            <div className="text-slate-500">City / State</div>
            <div className="text-slate-800">
              {[detailData?.city, detailData?.state].filter(Boolean).join(', ') || '—'}
            </div>
            <div className="text-slate-500">Max Students</div>
            <div className="text-slate-800">{detailData?.maxStudents ?? '—'}</div>
            <div className="text-slate-500">Created</div>
            <div className="text-slate-800">{detailData?.createdAt ? new Date(detailData.createdAt).toLocaleDateString() : '—'}</div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
