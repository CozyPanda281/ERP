import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  ClipboardList,
  Inbox,
  CalendarCheck,
  BookOpen,
  GraduationCap,
  Loader2,
  Link2Off,
} from 'lucide-react'
import { api, unwrap } from '../lib/api'
import type { TeacherOverview, UnlinkedResponse } from '../lib/types'
import StatCard from '../components/StatCard'

function formatTime(t: string | null) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${suffix}`
}

function formatDue(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function TeacherDashboard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'teacher'],
    queryFn: () => unwrap<TeacherOverview | UnlinkedResponse>(api.get('/dashboard/teacher')),
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
        <p className="mt-1 text-xs text-slate-400">Ask your admin to link this login to a staff record.</p>
      </div>
    )
  }

  const d = data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Welcome back, {d.staff.firstName} {d.staff.lastName}
          </h2>
          <p className="text-sm text-slate-500">
            {d.staff.designation ?? 'Teacher'} · {d.staff.employeeCode}
          </p>
        </div>
        <p className="text-xs text-slate-400">Auto-refreshes</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="My classes" value={d.myClasses.length} icon={BookOpen} />
        <StatCard label="Homework open" value={d.homework.open} icon={ClipboardList} />
        <StatCard
          label="Awaiting grading"
          value={d.submissions.pendingGrading}
          icon={Inbox}
          accent="text-amber-600"
        />
        <StatCard
          label="Attendance today"
          value={d.todayAttendance.rate !== null ? `${d.todayAttendance.rate}%` : '—'}
          icon={CalendarCheck}
        />
      </div>

      {d.myClasses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {d.myClasses.map((c) => (
            <span
              key={`${c.classId}-${c.sectionId ?? ''}-${c.subjectId}`}
              className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
            >
              {c.className}
              {c.sectionName ? `-${c.sectionName}` : ''} · {c.subjectName}
              {c.isClassTeacher ? ' · Class teacher' : ''}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Clock className="h-4 w-4 text-indigo-600" /> Today's schedule
          </h3>
          {d.todayPeriods.length === 0 ? (
            <p className="text-sm text-slate-400">No periods scheduled for today.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.todayPeriods.map((p, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-slate-800">
                    {formatTime(p.startTime)} – {formatTime(p.endTime)}
                  </span>
                  <span className="text-slate-600">
                    {p.subjectName} · {p.className}
                    {p.sectionName ? `-${p.sectionName}` : ''}
                    {p.roomNumber ? ` · Room ${p.roomNumber}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ClipboardList className="h-4 w-4 text-indigo-600" /> Homework — due soon
          </h3>
          {d.homework.recent.length === 0 ? (
            <p className="text-sm text-slate-400">No open homework.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.homework.recent.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{h.title}</p>
                    <p className="text-xs text-slate-400">
                      {h.subjectName} · {h.className}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-amber-600">
                    due {formatDue(h.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <GraduationCap className="h-4 w-4 text-indigo-600" /> Upcoming exams
        </h3>
        {d.upcomingExams.length === 0 ? (
          <p className="text-sm text-slate-400">No upcoming exams for your classes.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {d.upcomingExams.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium text-slate-800">
                  {e.examName} — {e.subjectName}
                  {e.maxMarks ? ` (${e.maxMarks} marks)` : ''}
                </span>
                <span className="text-slate-500">
                  {e.date ? formatDue(e.date) : '—'} {e.startTime ? `· ${formatTime(e.startTime)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
