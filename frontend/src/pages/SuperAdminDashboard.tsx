import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  Hourglass,
  Ban,
  Sparkles,
  AlertCircle,
  XCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { api, unwrap } from '../lib/api'
import type { SubscriptionStats, TenantStats } from '../lib/types'
import StatCard from '../components/StatCard'
import SimpleBars from '../components/SimpleBars'

interface AuditDailyPoint {
  date: string
  count: number
}

interface ExpiringSubscription {
  id: string
  tenantId: string
  tenantName?: string
  planCode?: string
  planName?: string
  endDate: string
  status: string
  tenant?: { name?: string; slug?: string }
}

export default function SuperAdminDashboard() {
  const tenants = useQuery({
    queryKey: ['admin', 'tenant-stats'],
    queryFn: () => unwrap<TenantStats>(api.get('/tenants/stats')),
    staleTime: 120_000,
  })
  const subs = useQuery({
    queryKey: ['admin', 'sub-stats'],
    queryFn: () => unwrap<SubscriptionStats>(api.get('/subscriptions/admin/stats')),
    staleTime: 120_000,
  })
  const expiring = useQuery({
    queryKey: ['admin', 'subs-expiring'],
    queryFn: () =>
      unwrap<ExpiringSubscription[]>(api.get('/subscriptions/admin/expiring', { params: { days: 30 } })),
    staleTime: 120_000,
  })
  const audit = useQuery({
    queryKey: ['admin', 'audit-daily'],
    queryFn: () => unwrap<AuditDailyPoint[]>(api.get('/audit/stats/daily', { params: { days: 14 } })),
    staleTime: 300_000,
  })

  const loading = tenants.isLoading || subs.isLoading
  const anyError = tenants.isError || subs.isError || expiring.isError || audit.isError

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading platform stats…
      </div>
    )
  }

  const t = tenants.data
  const s = subs.data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Platform Overview</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          <ShieldCheck className="h-3.5 w-3.5" /> SuperAdmin
        </span>
      </div>

      {anyError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Some widgets failed to load — refresh to retry.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total tenants" value={t?.total ?? '—'} icon={Building2} />
        <StatCard label="Active" value={t?.active ?? '—'} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="Trial" value={t?.trial ?? '—'} icon={Hourglass} accent="text-amber-600" />
        <StatCard label="Suspended" value={t?.suspended ?? '—'} icon={Ban} accent="text-red-600" />
        <StatCard label="New (30d)" value={t?.newLast30Days ?? '—'} icon={Sparkles} />
        <StatCard label="Overdue subs" value={s?.overdueCount ?? '—'} icon={AlertCircle} accent="text-red-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Subscription mix</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {s?.activeCount ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Trial</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {s?.trialCount ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Expired</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {s?.expiredCount ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Cancelled</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {s?.cancelledCount ?? '—'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600" /> Audit activity — 14 days
          </h3>
          {audit.data && audit.data.length > 0 ? (
            <SimpleBars
              data={audit.data.map((d) => ({
                label: d.date,
                value: d.count,
                hint: d.date.slice(5).replace('-', '/'),
              }))}
              format={(v) => `${v}`}
            />
          ) : (
            <p className="text-sm text-slate-400">No audit activity recorded.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <AlertCircle className="h-4 w-4 text-amber-600" /> Subscriptions expiring within 30 days
        </h3>
        {expiring.data && expiring.data.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {expiring.data.map((sub) => (
              <li key={sub.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium text-slate-800">
                  {sub.tenantName ?? sub.tenant?.name ?? sub.tenantId}
                </span>
                <span className="flex items-center gap-2 text-slate-500">
                  {sub.planName ?? sub.planCode ?? '—'}
                  <span className="text-xs text-amber-600">ends {sub.endDate}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-emerald-600">
            <XCircle className="h-4 w-4" /> Nothing expiring soon.
          </p>
        )}
      </section>
    </div>
  )
}
