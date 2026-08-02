import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Loader2,
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  UserRound,
  ClipboardList,
} from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { ClassRecord, Student, Subject, Timetable } from '../lib/types'

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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tones[tone]}`}>
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

interface SessionRow {
  id: string
  date: string
  startTime: string | null
  endTime: string | null
  totalPresent: number
  totalAbsent: number
  totalStudents: number
  className: string | null
  subjectName: string | null
  createdAt?: string | null
}
interface SessionDetail extends SessionRow {
  records: AttendanceRecord[]
}
interface AttendanceRecord {
  id: string
  studentId: string
  status: string
  remarks: string | null
  firstName: string
  lastName: string
  admissionNumber: string
  rollNumber: string | null
}
interface TimetableEntry {
  id: string
  subjectId: string | null
  startTime: string | null
  endTime: string | null
  roomNumber: string | null
  isBreak: boolean | null
}

const STATUSES = ['present', 'absent', 'late', 'excused']

export default function Attendance() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [detail, setDetail] = useState<SessionDetail | null>(null)

  const classesQuery = useQuery({
    queryKey: ['classes', branchId],
    queryFn: () => unwrap<ClassRecord[]>(api.get(`/branches/${branchId}/classes`)),
    enabled: !!branchId,
  })
  const subjectsQuery = useQuery({
    queryKey: ['subjects', branchId],
    queryFn: () => unwrap<Subject[]>(api.get(`/branches/${branchId}/subjects`)),
    enabled: !!branchId,
  })

  const sessionsQuery = useQuery({
    queryKey: ['attendance-sessions', fromDate, toDate, classFilter],
    queryFn: () =>
      unwrap<SessionRow[]>(
        api.get('/attendance', {
          params: { page: 1, limit: 50, fromDate: fromDate || undefined, toDate: toDate || undefined, classId: classFilter || undefined },
        }),
      ),
    enabled: !!branchId,
  })

  const detailQuery = useQuery({
    queryKey: ['attendance-session', detail?.id],
    queryFn: () => unwrap<SessionDetail>(api.get(`/attendance/sessions/${detail!.id}`)),
    enabled: !!detail,
  })

  const updateRecord = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks?: string }) =>
      unwrap<AttendanceRecord>(api.put(`/attendance/records/${id}`, { status, remarks })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-session'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] })
      setInfo('Attendance updated')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  // ---- Mark attendance ----
  const [markOpen, setMarkOpen] = useState(false)
  const [markForm, setMarkForm] = useState({ classId: '', timetableId: '', entryId: '', date: '' })
  const [statuses, setStatuses] = useState<Record<string, string>>({})

  const timetablesQuery = useQuery({
    queryKey: ['timetables', branchId, markForm.classId],
    queryFn: () =>
      unwrap<Timetable[]>(
        api.get(`/branches/${branchId}/timetables`, { params: { classId: markForm.classId || undefined, limit: 50 } }),
      ),
    enabled: !!branchId && !!markForm.classId,
  })
  const dayEntriesQuery = useQuery({
    queryKey: ['timetable-day', markForm.timetableId, markForm.date],
    queryFn: () => {
      const day = markForm.date ? new Date(markForm.date).getDay() : new Date().getDay()
      return unwrap<TimetableEntry[]>(api.get(`/timetables/${markForm.timetableId}/day/${day}`))
    },
    enabled: !!markForm.timetableId && !!markForm.date,
  })
  const classStudentsQuery = useQuery({
    queryKey: ['students-by-class', markForm.classId],
    queryFn: () =>
      unwrap<Student[]>(api.get(`/branches/${branchId}/students`, { params: { page: 1, limit: 100, classId: markForm.classId } })),
    enabled: !!branchId && !!markForm.classId,
  })

  const createSession = useMutation({
    mutationFn: (body: { timetableEntryId: string; date: string; records: { studentId: string; status: string }[] }) =>
      unwrap<SessionDetail>(api.post('/attendance/sessions', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] })
      setMarkOpen(false)
      setMarkForm({ classId: '', timetableId: '', entryId: '', date: '' })
      setStatuses({})
      setInfo('Attendance marked')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const subjectName = (id: string | null) => subjectsQuery.data?.find((s) => s.id === id)?.name ?? '—'

  const openDetail = (s: SessionRow) => {
    setDetail({ ...s, records: [] })
  }

  const markSubmit = () => {
    setError(null)
    setInfo(null)
    if (!markForm.entryId || !markForm.date) {
      setError('Select a timetable entry and date')
      return
    }
    const students = classStudentsQuery.data ?? []
    if (students.length === 0) {
      setError('No students in this class')
      return
    }
    createSession.mutate({
      timetableEntryId: markForm.entryId,
      date: markForm.date,
      records: students.map((s) => ({ studentId: s.id, status: statuses[s.id] ?? 'present' })),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Attendance</h2>
          <p className="text-sm text-slate-500">Sessions, marking and records</p>
        </div>
        <button
          onClick={() => setMarkOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Mark Attendance
        </button>
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

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          From
          <input className={`${inputCls} w-40`} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          To
          <input className={`${inputCls} w-40`} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <select className={`${inputCls} w-auto`} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {(classesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {sessionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Present</th>
                <th className="px-4 py-3">Absent</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(sessionsQuery.data ?? []).map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.date}</td>
                  <td className="px-4 py-3 text-slate-600">{s.className ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.subjectName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-emerald-700">{s.totalPresent}</td>
                  <td className="px-4 py-3 font-medium text-red-600">{s.totalAbsent}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openDetail(s)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      <ClipboardList className="h-3.5 w-3.5" /> Records
                    </button>
                  </td>
                </tr>
              ))}
              {(sessionsQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No attendance sessions in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={markOpen} title="Mark Attendance" onClose={() => setMarkOpen(false)} wide>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Class *</span>
              <select
                className={inputCls}
                value={markForm.classId}
                onChange={(e) => setMarkForm({ classId: e.target.value, timetableId: '', entryId: '', date: '' })}
              >
                <option value="">Select…</option>
                {(classesQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Timetable *</span>
              <select
                className={inputCls}
                value={markForm.timetableId}
                onChange={(e) => setMarkForm((f) => ({ ...f, timetableId: e.target.value, entryId: '' }))}
                disabled={!markForm.classId}
              >
                <option value="">{markForm.classId ? 'Select…' : 'Pick a class first'}</option>
                {(timetablesQuery.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.isActive ? '' : ' (inactive)'}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Date *</span>
              <input
                className={inputCls}
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={markForm.date}
                onChange={(e) => setMarkForm((f) => ({ ...f, date: e.target.value, entryId: '' }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Period *</span>
              <select
                className={inputCls}
                value={markForm.entryId}
                onChange={(e) => setMarkForm((f) => ({ ...f, entryId: e.target.value }))}
                disabled={!markForm.date}
              >
                <option value="">{markForm.date ? 'Select…' : 'Pick a date first'}</option>
                {(dayEntriesQuery.data ?? [])
                  .filter((e) => !e.isBreak)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.startTime ?? '?'}–{e.endTime ?? '?'} · {subjectName(e.subjectId)}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {markForm.entryId && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">
                Students ({classStudentsQuery.data?.length ?? 0})
              </p>
              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {(classStudentsQuery.data ?? []).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {s.firstName[0]}
                      {s.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400">{s.admissionNumber}</p>
                    </div>
                    <select
                      className={`${inputCls} w-28`}
                      value={statuses[s.id] ?? 'present'}
                      onChange={(e) => setStatuses((st) => ({ ...st, [s.id]: e.target.value }))}
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {(classStudentsQuery.data ?? []).length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-400">No students in this class.</p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={markSubmit}
            disabled={createSession.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createSession.isPending ? 'Marking…' : 'Mark Attendance'}
          </button>
        </div>
      </Modal>

      <Modal open={!!detail} title="Attendance Records" onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <CalendarCheck className="h-4 w-4 text-indigo-500" /> {detailQuery.data?.date ?? detail.date}
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Clock className="h-4 w-4 text-indigo-500" />
                {detailQuery.data?.startTime && detailQuery.data?.endTime
                  ? `${detailQuery.data.startTime}–${detailQuery.data.endTime}`
                  : '—'}
              </span>
              <span className="ml-auto flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> {detailQuery.data?.totalPresent ?? detail.totalPresent} present
                </span>
                <span className="inline-flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" /> {detailQuery.data?.totalAbsent ?? detail.totalAbsent} absent
                </span>
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">Admission</th>
                    <th className="px-4 py-2">Roll</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailQuery.data?.records ?? []).map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          {r.firstName} {r.lastName}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.admissionNumber}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.rollNumber ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <select
                            className={`${inputCls} w-28`}
                            value={r.status}
                            onChange={(e) => updateRecord.mutate({ id: r.id, status: e.target.value })}
                          >
                            {STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          {r.status === 'present' && <Badge tone="green">P</Badge>}
                          {r.status === 'absent' && <Badge tone="red">A</Badge>}
                          {r.status === 'late' && <Badge tone="amber">L</Badge>}
                          {r.status === 'excused' && <Badge>E</Badge>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(detailQuery.data?.records ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        Loading records…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
