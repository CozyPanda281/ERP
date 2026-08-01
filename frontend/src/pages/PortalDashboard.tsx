import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
  BedDouble,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  CalendarCheck,
  Clock,
  DoorOpen,
  FileText,
  Fuel,
  Hotel,
  Inbox,
  Landmark,
  Loader2,
  ReceiptText,
  ScrollText,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { api, unwrap } from '../lib/api'
import type { AuthUser } from '../lib/types'
import StatCard from '../components/StatCard'

type Data = Record<string, any>

interface StatDef {
  label: string
  value: (d: Data) => string | number
  icon: LucideIcon
  accent?: string
}

interface SectionDef {
  title: string
  icon: LucideIcon
  body: (d: Data) => React.ReactNode
}

interface PortalDef {
  title: string
  endpoint: string
  stats: StatDef[]
  sections?: SectionDef[]
}

const inr = (n: number | string | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN')}`

const pct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${n}%`)

function dateLabel(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const CONFIG: Record<string, PortalDef> = {
  accountant: {
    title: 'Accountant',
    endpoint: '/dashboard/accountant',
    stats: [
      { label: 'Collected today', value: (d) => inr(d.fees?.collectedToday), icon: Banknote, accent: 'text-emerald-600' },
      { label: 'This month', value: (d) => inr(d.fees?.collectedThisMonth), icon: ReceiptText },
      { label: 'Pending invoices', value: (d) => d.fees?.pendingInvoices ?? 0, icon: FileText, accent: 'text-amber-600' },
      { label: 'Due accounts', value: (d) => d.fees?.dueAccounts ?? 0, icon: Landmark, accent: 'text-red-600' },
    ],
    sections: [
      {
        title: 'This month — money in & out',
        icon: ScrollText,
        body: (d) => (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Income</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{inr(d.income?.thisMonth)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Expenses</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{inr(d.expenses?.thisMonth)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Net</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{inr(d.net?.thisMonth)}</p>
            </div>
          </div>
        ),
      },
      {
        title: 'Recent payments',
        icon: ReceiptText,
        body: (d) =>
          (d.recentPayments ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recentPayments.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {p.transactionNo} · {p.paymentMethod ?? '—'} · {dateLabel(p.paidDate)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-emerald-600">{inr(p.amount)}</span>
                </li>
              ))}
            </ul>
          ),
      },
    ],
  },
  hr: {
    title: 'HR',
    endpoint: '/dashboard/hr',
    stats: [
      { label: 'Staff total', value: (d) => d.staff?.total ?? 0, icon: Users },
      { label: 'Teaching staff', value: (d) => d.staff?.teaching ?? 0, icon: BookOpen },
      { label: 'Pending leave', value: (d) => d.leave?.pendingRequests ?? 0, icon: CalendarCheck, accent: 'text-amber-600' },
      { label: 'Open postings', value: (d) => d.recruitment?.openPostings ?? 0, icon: Briefcase },
    ],
    sections: [
      {
        title: 'Staff overview',
        icon: Users,
        body: (d) => (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            {[
              ['Active', d.staff?.active ?? 0],
              ['Inactive', d.staff?.inactive ?? 0],
              ['Joined this month', d.staff?.joiningThisMonth ?? 0],
              ['Approved leaves', d.leave?.approvedThisMonth ?? 0],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        ),
      },
      {
        title: 'Recruitment',
        icon: Briefcase,
        body: (d) => (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-600">Applications received</span>
            <span className="font-semibold text-slate-900">{d.recruitment?.applications ?? 0}</span>
          </div>
        ),
      },
    ],
  },
  reception: {
    title: 'Reception',
    endpoint: '/dashboard/reception',
    stats: [
      { label: 'Visitors today', value: (d) => d.visitors?.today ?? 0, icon: DoorOpen },
      { label: 'Checked in now', value: (d) => d.visitors?.checkedInNow ?? 0, icon: Clock, accent: 'text-emerald-600' },
      { label: 'New enquiries', value: (d) => d.admissions?.newEnquiries ?? 0, icon: Inbox, accent: 'text-amber-600' },
      { label: 'Pending applications', value: (d) => d.admissions?.pendingApplications ?? 0, icon: FileText },
    ],
    sections: [
      {
        title: 'Admissions pipeline',
        icon: FileText,
        body: (d) => (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Total enquiries</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{d.admissions?.totalEnquiries ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Applications today</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{d.admissions?.applicationsToday ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Active notices</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {d.announcements?.active ?? 0}/{d.announcements?.circulars ?? 0}
              </p>
            </div>
          </div>
        ),
      },
      {
        title: 'Recent visitors',
        icon: DoorOpen,
        body: (d) =>
          (d.recentVisitors ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No visitors yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recentVisitors.map((v: any) => (
                <li key={v.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{v.name}</p>
                    <p className="text-xs text-slate-400">
                      {v.purpose} {v.personToMeet ? `· to see ${v.personToMeet}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      v.status === 'checked_in' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {v.status}
                  </span>
                </li>
              ))}
            </ul>
          ),
      },
    ],
  },
  librarian: {
    title: 'Librarian',
    endpoint: '/dashboard/librarian',
    stats: [
      { label: 'Books', value: (d) => d.books?.total ?? 0, icon: BookOpen },
      { label: 'Available', value: (d) => d.books?.available ?? 0, icon: BookOpen, accent: 'text-emerald-600' },
      { label: 'Issues active', value: (d) => d.issues?.active ?? 0, icon: ScrollText },
      { label: 'Overdue', value: (d) => d.issues?.overdue ?? 0, icon: Clock, accent: 'text-red-600' },
    ],
    sections: [
      {
        title: 'Members & dues',
        icon: Users,
        body: (d) => (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Active members</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{d.members?.active ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Due today</p>
              <p className="mt-1 text-base font-semibold text-amber-600">{d.issues?.dueToday ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Due soon</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {(d.issues?.active ?? 0) - (d.issues?.overdue ?? 0)}
              </p>
            </div>
          </div>
        ),
      },
      {
        title: 'Recent issues',
        icon: BookOpen,
        body: (d) =>
          (d.recentIssues ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No recent issues.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recentIssues.map((i: any) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{i.bookTitle}</p>
                    <p className="text-xs text-slate-400">
                      member · {i.memberType} · due {dateLabel(i.dueDate)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500">{i.status}</span>
                </li>
              ))}
            </ul>
          ),
      },
    ],
  },
  transport: {
    title: 'Transport Manager',
    endpoint: '/dashboard/transport',
    stats: [
      { label: 'Vehicles', value: (d) => d.vehicles?.total ?? 0, icon: Bus },
      { label: 'Active routes', value: (d) => d.routes?.active ?? 0, icon: Bus, accent: 'text-emerald-600' },
      { label: 'Active assignments', value: (d) => d.assignments?.active ?? 0, icon: Users },
      { label: 'Fuel (month)', value: (d) => inr(d.fuel?.costThisMonth), icon: Fuel, accent: 'text-amber-600' },
    ],
    sections: [
      {
        title: 'Fleet & maintenance',
        icon: Wrench,
        body: (d) => (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Active</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{d.vehicles?.active ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Inactive</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{d.vehicles?.inactive ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Service due</p>
              <p className="mt-1 text-base font-semibold text-red-600">{d.maintenance?.dueNow ?? 0}</p>
            </div>
          </div>
        ),
      },
      {
        title: 'Recent fuel logs',
        icon: Fuel,
        body: (d) =>
          (d.fuel?.recent ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No fuel logs yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.fuel.recent.map((f: any) => (
                <li key={f.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{f.vehicleNumber}</p>
                    <p className="text-xs text-slate-400">{dateLabel(f.fuelDate)}</p>
                  </div>
                  <span className="shrink-0 font-medium text-slate-700">
                    {f.quantityLiters ? `${f.quantityLiters} L` : ''} {inr(f.totalCost)}
                  </span>
                </li>
              ))}
            </ul>
          ),
      },
    ],
  },
  hostel: {
    title: 'Hostel Manager',
    endpoint: '/dashboard/hostel',
    stats: [
      { label: 'Hostels', value: (d) => d.hostels?.active ?? 0, icon: Hotel },
      { label: 'Rooms occupied', value: (d) => d.rooms?.occupied ?? 0, icon: BedDouble, accent: 'text-indigo-600' },
      { label: 'Occupancy', value: (d) => pct(d.rooms?.occupancyRate), icon: Building2, accent: 'text-emerald-600' },
      { label: 'Active allocations', value: (d) => d.allocations?.active ?? 0, icon: Users },
    ],
    sections: [
      {
        title: 'Rooms & attendance today',
        icon: CalendarCheck,
        body: (d) => (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Total rooms</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{d.rooms?.total ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Present</p>
              <p className="mt-1 text-base font-semibold text-emerald-600">{d.attendance?.present ?? 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Absent</p>
              <p className="mt-1 text-base font-semibold text-red-600">{d.attendance?.absent ?? 0}</p>
            </div>
          </div>
        ),
      },
      {
        title: 'Recent allocations',
        icon: BedDouble,
        body: (d) =>
          (d.allocations?.recent ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No allocations yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.allocations.recent.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{a.studentName}</p>
                    <p className="text-xs text-slate-400">
                      {a.hostelName} · Room {a.roomNumber}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500">{a.status}</span>
                </li>
              ))}
            </ul>
          ),
      },
    ],
  },
}

export default function PortalDashboard({ role, user }: { role: string; user: AuthUser }) {
  const def = CONFIG[role]
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', role],
    queryFn: () => unwrap<Data>(api.get(def.endpoint)),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Welcome back, {user.firstName} {user.lastName}
          </h2>
          <p className="text-sm text-slate-500">{def.title} workspace</p>
        </div>
        <p className="text-xs text-slate-400">Auto-refreshes</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {def.stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value(data)} icon={s.icon} accent={s.accent} />
        ))}
      </div>

      {def.sections && (
        <div className="grid gap-6 lg:grid-cols-2">
          {def.sections.map((sec) => (
            <section key={sec.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <sec.icon className="h-4 w-4 text-indigo-600" /> {sec.title}
              </h3>
              {sec.body(data)}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
