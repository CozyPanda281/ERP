import { useQuery } from '@tanstack/react-query'
import {
  Users,
  IndianRupee,
  CalendarCheck,
  Loader2,
  Link2Off,
  UserRound,
} from 'lucide-react'
import { api, unwrap } from '../lib/api'
import type { ParentOverview, UnlinkedResponse } from '../lib/types'
import StatCard from '../components/StatCard'

const money = (v: number) =>
  v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export default function ParentDashboard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'parent'],
    queryFn: () => unwrap<ParentOverview | UnlinkedResponse>(api.get('/dashboard/parent')),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your dashboard…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{(error as Error)?.message ?? 'Could not load dashboard'}</p>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data.linked) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-24 text-center">
        <Link2Off className="mb-4 h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-600">{data.message}</p>
        <p className="mt-1 text-xs text-slate-400">Ask your school to link this login to a parent record.</p>
      </div>
    )
  }

  const d = data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Hi {d.parentName}</h2>
          <p className="text-sm text-slate-500">
            {d.children.length} linked student{d.children.length === 1 ? '' : 's'}
          </p>
        </div>
        <p className="text-xs text-slate-400">Auto-refreshes</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Children" value={d.totals.children} icon={Users} />
        <StatCard
          label="Total paid"
          value={money(d.totals.totalPaid)}
          icon={IndianRupee}
          accent="text-emerald-600"
        />
        <StatCard
          label="Total due"
          value={money(d.totals.totalDue)}
          icon={IndianRupee}
          accent="text-amber-600"
        />
        <StatCard label="Track attendance" value={d.children.length} icon={CalendarCheck} />
      </div>

      {d.children.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
          No children linked to your account yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {d.children.map((c) => (
            <section key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.className ?? 'Unassigned'}
                    {c.sectionName ? `-${c.sectionName}` : ''} · {c.admissionNumber}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Present (30d)</p>
                  <p className="text-base font-bold text-emerald-600 tabular-nums">{c.attendance.present}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Absent</p>
                  <p className="text-base font-bold text-red-600 tabular-nums">{c.attendance.absent}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Rate</p>
                  <p className="text-base font-bold text-slate-900 tabular-nums">
                    {c.attendance.rate !== null ? `${c.attendance.rate}%` : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Fee due</p>
                  <p className="text-base font-bold text-amber-600 tabular-nums">
                    {money(c.fees.totalDue)}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
