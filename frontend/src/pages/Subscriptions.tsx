import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, CreditCard } from 'lucide-react'
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
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className={`my-8 w-full max-w-md rounded-xl bg-white p-6 shadow-xl`}>
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

interface Plan {
  id: string
  name: string
  code: string
  description: string | null
  priceMonthly: string | null
  priceYearly: string | null
  maxBranches: number | null
  maxUsers: number | null
  maxStudents: number | null
  maxStaff: number | null
  storageLimitMb: number | null
  isActive: boolean | null
}

interface Subscription {
  id: string
  tenantId: string
  planId: string
  startDate: string | null
  endDate: string | null
  billingCycle: string | null
  status: string | null
  autoRenew: boolean | null
  tenantName?: string
  tenantSlug?: string
  planName?: string
  planCode?: string
}

const EMPTY_PLAN = {
  name: '',
  code: '',
  description: '',
  priceMonthly: '',
  priceYearly: '',
  maxBranches: '1',
  maxUsers: '50',
  maxStudents: '500',
  maxStaff: '50',
  storageLimitMb: '500',
}

export default function Subscriptions() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tab, setTab] = useState<'plans' | 'subscriptions'>('plans')
  const [planOpen, setPlanOpen] = useState(false)
  const [planForm, setPlanForm] = useState({ ...EMPTY_PLAN })
  const [saving, setSaving] = useState(false)

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/subscriptions/plans'),
  })
  const plans = (plansQuery.data?.data?.data ?? []) as Plan[]

  const subsQuery = useQuery({
    queryKey: ['subscriptions-all'],
    queryFn: () => api.get('/subscriptions/admin/all', { params: { page: 1, limit: 100 } }),
  })
  const subsData = subsQuery.data?.data?.data
  const subscriptions = (Array.isArray(subsData) ? subsData : ((subsData as { data?: unknown } | undefined)?.data ?? [])) as Subscription[]

  const createPlan = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/subscriptions/plans', {
          name: planForm.name,
          code: planForm.code,
          description: planForm.description || undefined,
          priceMonthly: Number(planForm.priceMonthly),
          priceYearly: Number(planForm.priceYearly),
          maxBranches: Number(planForm.maxBranches),
          maxUsers: Number(planForm.maxUsers),
          maxStudents: Number(planForm.maxStudents),
          maxStaff: Number(planForm.maxStaff),
          storageLimitMb: Number(planForm.storageLimitMb),
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setPlanOpen(false)
      setPlanForm({ ...EMPTY_PLAN })
      setInfo('Plan created')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const deletePlan = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/subscriptions/plans/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setInfo('Plan deactivated')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const statusTone = (s: string | null): 'green' | 'amber' | 'slate' | 'red' =>
    s === 'active' ? 'green' : s === 'trial' ? 'amber' : s === 'suspended' ? 'red' : 'slate'

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
          <h1 className="text-lg font-semibold text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-500">Plans and tenant subscriptions</p>
        </div>
        {tab === 'plans' && (
          <button
            onClick={() => setPlanOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={16} /> New Plan
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
        {(['plans', 'subscriptions'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 font-medium capitalize transition ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'plans' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Monthly</th>
                <th className="px-4 py-3 font-medium">Yearly</th>
                <th className="px-4 py-3 font-medium">Limits</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-indigo-500" />
                      <div>
                        <div className="font-medium text-slate-800">{p.name}</div>
                        <div className="font-mono text-xs text-slate-400">{p.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{p.priceMonthly ?? '0'}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{p.priceYearly ?? '0'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.maxBranches ?? '—'} branches · {p.maxUsers ?? '—'} users · {p.maxStudents ?? '—'} students
                  </td>
                  <td className="px-4 py-3"><Badge tone={p.isActive !== false ? 'green' : 'slate'}>{p.isActive !== false ? 'active' : 'inactive'}</Badge></td>
                  <td className="px-4 py-3">
                    {p.isActive !== false && (
                      <button onClick={() => deletePlan.mutate(p.id)} className="text-slate-400 hover:text-red-600" aria-label="Deactivate">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Cycle</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {s.tenantName ?? s.tenantId.slice(0, 8)}
                    <div className="font-mono text-xs text-slate-400">{s.tenantSlug ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.planName ?? s.planCode ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.billingCycle ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.startDate ? String(s.startDate).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.endDate ? String(s.endDate).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(s.status)}>{s.status ?? '—'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={planOpen} title="New Subscription Plan" onClose={() => setPlanOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createPlan.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" required>
              <input
                required
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Code" required>
              <input
                required
                value={planForm.code}
                onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                placeholder="e.g. premium"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Description">
            <input
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly Price">
              <input
                type="number"
                min={0}
                step="0.01"
                value={planForm.priceMonthly}
                onChange={(e) => setPlanForm({ ...planForm, priceMonthly: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Yearly Price">
              <input
                type="number"
                min={0}
                step="0.01"
                value={planForm.priceYearly}
                onChange={(e) => setPlanForm({ ...planForm, priceYearly: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max Branches">
              <input
                type="number"
                min={1}
                value={planForm.maxBranches}
                onChange={(e) => setPlanForm({ ...planForm, maxBranches: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Max Users">
              <input
                type="number"
                min={1}
                value={planForm.maxUsers}
                onChange={(e) => setPlanForm({ ...planForm, maxUsers: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Max Students">
              <input
                type="number"
                min={1}
                value={planForm.maxStudents}
                onChange={(e) => setPlanForm({ ...planForm, maxStudents: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Max Staff">
              <input
                type="number"
                min={1}
                value={planForm.maxStaff}
                onChange={(e) => setPlanForm({ ...planForm, maxStaff: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Storage (MB)">
              <input
                type="number"
                min={1}
                value={planForm.storageLimitMb}
                onChange={(e) => setPlanForm({ ...planForm, storageLimitMb: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPlanOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Create Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
