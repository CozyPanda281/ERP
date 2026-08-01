import { useQuery } from '@tanstack/react-query'
import {
  CalendarCheck,
  IndianRupee,
  ClipboardList,
  FileText,
  Loader2,
  Link2Off,
  IdCard,
} from 'lucide-react'
import { api, unwrap } from '../lib/api'
import type { StudentOverview, UnlinkedResponse } from '../lib/types'
import StatCard from '../components/StatCard'

const money = (v: number) =>
  v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export default function StudentDashboard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: () => unwrap<StudentOverview | UnlinkedResponse>(api.get('/dashboard/student')),
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
        <p className="mt-1 text-xs text-slate-400">Ask your school to link this login to your student record.</p>
      </div>
    )
  }

  const d = data
  const acc = d.fees.account

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {`${d.student.firstName[0]}${d.student.lastName[0]}`.toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {d.student.firstName} {d.student.lastName}
              </h2>
              <p className="text-sm text-slate-500">
                {d.enrollment
                  ? `${d.enrollment.className}${d.enrollment.sectionName ? `-${d.enrollment.sectionName}` : ''} · ${d.enrollment.academicYear}`
                  : 'No current enrollment'}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            <IdCard className="h-3.5 w-3.5" /> {d.student.admissionNumber}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Attendance (30d)"
          value={d.attendance.rate !== null ? `${d.attendance.rate}%` : '—'}
          icon={CalendarCheck}
        />
        <StatCard
          label="Fee balance"
          value={acc ? money(acc.totalDue) : '—'}
          icon={IndianRupee}
          accent="text-amber-600"
        />
        <StatCard label="Homework open" value={d.homework.open} icon={ClipboardList} />
        <StatCard label="Results recorded" value={d.results.length} icon={FileText} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarCheck className="h-4 w-4 text-indigo-600" /> Attendance — last 30 days
          </h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-500">Days marked</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{d.attendance.daysRecorded}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Present</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">{d.attendance.present}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Absent</p>
              <p className="text-lg font-bold text-red-600 tabular-nums">{d.attendance.absent}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Excused</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{d.attendance.excused}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <IndianRupee className="h-4 w-4 text-indigo-600" /> Fees
          </h3>
          {acc ? (
            <>
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Total fee</p>
                  <p className="text-lg font-bold text-slate-900 tabular-nums">{money(acc.totalFee)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="text-lg font-bold text-emerald-600 tabular-nums">{money(acc.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Due</p>
                  <p className="text-lg font-bold text-amber-600 tabular-nums">{money(acc.totalDue)}</p>
                </div>
              </div>
              {d.fees.recentPayments.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {d.fees.recentPayments.map((p) => (
                    <li key={p.transactionNo} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-slate-600">{p.transactionNo}</span>
                      <span className="font-medium text-slate-800">{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">No fee account found.</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-indigo-600" /> Recent results
          </h3>
          {d.results.length === 0 ? (
            <p className="text-sm text-slate-400">No results recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Exam</th>
                  <th className="pb-2 text-right font-medium">Marks</th>
                  <th className="pb-2 text-right font-medium">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.results.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium text-slate-800">{r.subjectName}</td>
                    <td className="py-2 text-slate-500">{r.examName}</td>
                    <td className="py-2 text-right tabular-nums text-slate-700">
                      {r.isAbsent ? 'ABS' : r.marksObtained !== null ? `${r.marksObtained}/${r.maxMarks}` : '—'}
                    </td>
                    <td className="py-2 text-right font-semibold text-indigo-700">{r.grade ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ClipboardList className="h-4 w-4 text-indigo-600" /> Homework due soon
          </h3>
          {d.homework.dueSoon.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing due right now.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.homework.dueSoon.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{h.title}</p>
                    <p className="text-xs text-slate-400">{h.subjectName}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-amber-600">
                    due {new Date(h.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
