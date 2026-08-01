import { useQuery } from '@tanstack/react-query'
import {
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  Library,
  Building2,
  FilePlus2,
  PhoneCall,
  PackageX,
  Megaphone,
  ClipboardList,
  IndianRupee,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CalendarCheck,
  Loader2,
} from 'lucide-react'
import { unwrap, api } from '../lib/api'
import type { OverviewData } from '../lib/types'
import StatCard from '../components/StatCard'
import SimpleBars from '../components/SimpleBars'

const money = (v: number) =>
  v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export default function OverviewDashboard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => unwrap<OverviewData>(api.get('/dashboard/overview')),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading dashboard…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">
          {(error as Error)?.message ?? 'Could not load dashboard'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const t = data.totals
  const fee = data.fees
  const att = data.attendance

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">School Overview</h2>
        <p className="text-xs text-slate-400">As of {data.asOf} · auto-refreshes</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Students" value={t.students} icon={GraduationCap} />
        <StatCard label="Staff" value={t.staff} icon={Users} />
        <StatCard label="Classes" value={t.classes} icon={BookOpen} />
        <StatCard label="Sections" value={t.sections} icon={Layers} />
        <StatCard label="Subjects" value={t.subjects} icon={Library} />
        <StatCard label="Branches" value={t.branches} icon={Building2} />
        <StatCard
          label="Pending applications"
          value={t.pendingApplications}
          icon={FilePlus2}
          accent="text-amber-600"
        />
        <StatCard label="Enquiries" value={t.enquiries} icon={PhoneCall} />
        <StatCard
          label="Low stock items"
          value={t.lowStockItems}
          icon={PackageX}
          accent="text-red-600"
        />
        <StatCard label="Announcements" value={t.announcements} icon={Megaphone} />
        <StatCard label="Homework" value={t.homework} icon={ClipboardList} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <IndianRupee className="h-4 w-4 text-indigo-600" /> Fee Collection
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">This month</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {money(fee.collectedThisMonth)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total collected</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {money(fee.collectedTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total due</p>
              <p className="text-lg font-bold text-amber-600 tabular-nums">
                {money(fee.dueAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Accounts in arrears</p>
              <p className="text-lg font-bold text-red-600 tabular-nums">{fee.dueAccounts}</p>
            </div>
          </div>
          <div className="mt-6">
            <SimpleBars
              data={fee.monthlySeries.map((p) => ({
                label: p.month,
                value: p.amount,
                hint: p.month.slice(5),
              }))}
              format={money}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarCheck className="h-4 w-4 text-indigo-600" /> Attendance — last 7 days
          </h3>
          <div className="mb-4 flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-500">Today</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {att.today.rate !== null ? `${att.today.rate}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Present</p>
              <p className="text-lg font-semibold text-emerald-600 tabular-nums">
                {att.today.present}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Absent</p>
              <p className="text-lg font-semibold text-red-600 tabular-nums">
                {att.today.absent}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Marked for</p>
              <p className="text-lg font-semibold text-slate-900 tabular-nums">
                {att.today.total}
              </p>
            </div>
          </div>
          <SimpleBars
            data={att.weekly.map((d) => ({
              label: d.date,
              value: d.rate ?? 0,
              hint: d.date.slice(5).replace('-', '/'),
            }))}
            format={(v) => `${v}%`}
          />
          {!att.today.marked && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <AlertTriangle className="h-3.5 w-3.5" /> No attendance marked yet today.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <TrendingUp className="h-4 w-4 text-indigo-600" /> Financial pulse
        </h3>
        <p className="text-sm text-slate-600">
          Lifetime collections <span className="font-semibold">{money(fee.collectedTotal)}</span>{' '}
          against <span className="font-semibold text-amber-600">{money(fee.dueAmount)}</span>{' '}
          outstanding across {fee.dueAccounts} accounts.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
          <Wallet className="h-4 w-4" /> {money(fee.collectedThisMonth)} collected so far this
          month.
        </p>
      </section>
    </div>
  )
}
