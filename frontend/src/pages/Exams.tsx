import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, CalendarDays, ClipboardList, Clock, DoorOpen, Trophy, Save } from 'lucide-react'
import { unwrap, unwrapList, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { AcademicYear, ClassRecord, Subject } from '../lib/types'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

const EXAM_TYPES = ['unit_test', 'quarterly', 'half_yearly', 'annual', 'pre_board', 'weekly_test']

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
      <div className={`my-8 w-full ${wide ? 'max-w-3xl' : 'max-w-md'} rounded-xl bg-white p-6 shadow-xl`}>
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

interface Exam {
  id: string
  name: string
  examType: string
  classId: string
  startDate: string | null
  endDate: string | null
  description: string | null
  isActive: boolean
  createdAt: string | null
  className?: string | null
}

interface ExamSchedule {
  id: string
  examId: string
  subjectId: string
  classId: string | null
  date: string | null
  startTime: string | null
  endTime: string | null
  maxMarks: number
  passMarks: number
  roomNumber: string | null
  subjectName?: string | null
}

interface MarkRow {
  id: string
  studentId: string
  marksObtained: number | null
  maxMarks: number
  isAbsent: boolean
  isMalpractice: boolean
  grade: string | null
  gradePoint: number | null
  remarks: string | null
  firstName: string
  lastName: string
  admissionNumber: string | null
  rollNumber: string | null
}

const EMPTY_EXAM = {
  name: '',
  examType: 'unit_test',
  classId: '',
  academicYearId: '',
  startDate: '',
  endDate: '',
  description: '',
}

const EMPTY_SCHEDULE = {
  subjectId: '',
  date: '',
  startTime: '',
  endTime: '',
  roomNumber: '',
  maxMarks: '100',
  passMarks: '33',
}

export default function Exams() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [examForm, setExamForm] = useState(EMPTY_EXAM)
  const [detail, setDetail] = useState<Exam | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE)
  const [marksScheduleId, setMarksScheduleId] = useState<string | null>(null)
  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({})
  const [absentDraft, setAbsentDraft] = useState<Record<string, boolean>>({})

  const yearsQuery = useQuery({
    queryKey: ['academic-years', branchId],
    queryFn: () => unwrap<AcademicYear[]>(api.get(`/branches/${branchId}/academic-years`)),
    select: (d) => (Array.isArray(d) ? d : []),
    enabled: !!branchId,
  })

  const classesQuery = useQuery({
    queryKey: ['classes', branchId],
    queryFn: () => unwrap<ClassRecord[]>(api.get(`/branches/${branchId}/classes`)),
    select: (d) => (Array.isArray(d) ? d : []),
    enabled: !!branchId,
  })

  const subjectsQuery = useQuery({
    queryKey: ['subjects', branchId],
    queryFn: () => unwrap<Subject[]>(api.get(`/branches/${branchId}/subjects`)),
    select: (d) => (Array.isArray(d) ? d : []),
    enabled: !!branchId,
  })

  const listQuery = useQuery({
    queryKey: ['exams', branchId, search, typeFilter],
    queryFn: () =>
      api.get('/exams', {
        params: { page: 1, limit: 100, search: search || undefined, examType: typeFilter || undefined },
      }),
    select: (res) => unwrapList<Exam>(res),
    enabled: !!branchId,
  })

  const schedulesQuery = useQuery({
    queryKey: ['exam-schedules', detail?.id],
    queryFn: () => unwrap<ExamSchedule[]>(api.get(`/exams/${detail!.id}/schedules`)),
    select: (d) => (Array.isArray(d) ? d : []),
    enabled: !!detail,
  })

  const marksQuery = useQuery({
    queryKey: ['exam-marks', marksScheduleId],
    queryFn: () => api.get(`/exam-marks/schedule/${marksScheduleId}`, { params: { page: 1, limit: 200 } }),
    select: (res) => unwrapList<MarkRow>(res),
    enabled: !!marksScheduleId,
  })

  const createExam = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<Exam>(api.post('/exams', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      setCreateOpen(false)
      setExamForm(EMPTY_EXAM)
      setInfo('Exam created')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const deleteExam = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/exams/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      setDetail(null)
      setInfo('Exam deleted')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const createSchedule = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<ExamSchedule>(api.post(`/exams/${detail!.id}/schedules`, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-schedules'] })
      setScheduleOpen(false)
      setScheduleForm(EMPTY_SCHEDULE)
      setInfo('Schedule added')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const deleteSchedule = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/exam-schedules/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-schedules'] })
      if (marksScheduleId) setMarksScheduleId(null)
      setInfo('Schedule removed')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const bulkMarks = useMutation({
    mutationFn: (body: { examScheduleId: string; marks: { studentId: string; marksObtained?: number; isAbsent?: boolean }[] }) =>
      unwrap<{ success: boolean }>(api.post('/exam-marks/bulk', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-marks'] })
      setMarksDraft({})
      setAbsentDraft({})
      setInfo('Marks saved')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const generateResults = useMutation({
    mutationFn: (examId: string) => unwrap<{ success: boolean }>(api.post(`/exams/${examId}/generate-results`)),
    onSuccess: () => setInfo('Results generated'),
    onError: (e) => setError(errorMessage(e)),
  })

  const submitExam = () => {
    setError(null)
    setInfo(null)
    if (!examForm.name.trim() || !examForm.classId) {
      setError('Exam name and class are required')
      return
    }
    const body: Record<string, unknown> = { ...examForm }
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' && !v.trim()) body[k] = undefined
    }
    createExam.mutate(body)
  }

  const submitSchedule = () => {
    setError(null)
    setInfo(null)
    if (!scheduleForm.subjectId || !scheduleForm.date) {
      setError('Subject and date are required')
      return
    }
    createSchedule.mutate({
      subjectId: scheduleForm.subjectId,
      classId: detail?.classId,
      date: scheduleForm.date,
      startTime: scheduleForm.startTime || undefined,
      endTime: scheduleForm.endTime || undefined,
      roomNumber: scheduleForm.roomNumber || undefined,
      maxMarks: Number(scheduleForm.maxMarks) || undefined,
      passMarks: Number(scheduleForm.passMarks) || undefined,
    })
  }

  const openMarks = (scheduleId: string) => {
    setMarksDraft({})
    setAbsentDraft({})
    setMarksScheduleId(scheduleId)
  }

  const saveMarks = () => {
    setError(null)
    setInfo(null)
    const rows = marksQuery.data ?? []
    const marks: { studentId: string; marksObtained?: number; isAbsent?: boolean }[] = rows
      .filter((r) => !absentDraft[r.studentId])
      .map((r) => ({
        studentId: r.studentId,
        marksObtained: marksDraft[r.studentId] !== undefined && marksDraft[r.studentId] !== '' ? Number(marksDraft[r.studentId]) : undefined,
        isAbsent: false,
      }))
    for (const row of rows) {
      if (absentDraft[row.studentId]) {
        marks.push({ studentId: row.studentId, isAbsent: true })
      }
    }
    if (!marksScheduleId) return
    bulkMarks.mutate({ examScheduleId: marksScheduleId, marks })
  }

  const subjectName = (id: string | null) => subjectsQuery.data?.find((s) => s.id === id)?.name ?? '—'
  const className = (id: string | null) => classesQuery.data?.find((c) => c.id === id)?.name ?? '—'
  const schedules = schedulesQuery.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Exams &amp; Results</h2>
          <p className="text-sm text-slate-500">{listQuery.data?.length ?? 0} exam(s)</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Create Exam
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
        <input
          className={`${inputCls} min-w-52 flex-1`}
          placeholder="Search exams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${inputCls} w-auto`} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {EXAM_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {listQuery.isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((ex) => (
                <tr
                  key={ex.id}
                  className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/40"
                  onClick={() => {
                    setMarksScheduleId(null)
                    setDetail(ex)
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{ex.name}</p>
                    {ex.description && <p className="max-w-xs truncate text-xs text-slate-400">{ex.description}</p>}
                  </td>
                  <td className="px-4 py-3"><Badge>{ex.examType.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{ex.className ?? className(ex.classId)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {ex.startDate ? new Date(ex.startDate).toLocaleDateString() : '—'}
                    {ex.endDate ? ` → ${new Date(ex.endDate).toLocaleDateString()}` : ''}
                  </td>
                  <td className="px-4 py-3">{ex.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Closed</Badge>}</td>
                </tr>
              ))}
              {(listQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">No exams yet. Create one to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={createOpen} title="Create Exam" onClose={() => setCreateOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Exam name" required>
            <input className={inputCls} value={examForm.name} onChange={(e) => setExamForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Exam type">
            <select className={inputCls} value={examForm.examType} onChange={(e) => setExamForm((f) => ({ ...f, examType: e.target.value }))}>
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Class" required>
            <select className={inputCls} value={examForm.classId} onChange={(e) => setExamForm((f) => ({ ...f, classId: e.target.value }))}>
              <option value="">Select…</option>
              {(classesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Academic year">
            <select className={inputCls} value={examForm.academicYearId} onChange={(e) => setExamForm((f) => ({ ...f, academicYearId: e.target.value }))}>
              <option value="">Current</option>
              {(yearsQuery.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input className={inputCls} type="date" value={examForm.startDate} onChange={(e) => setExamForm((f) => ({ ...f, startDate: e.target.value }))} />
          </Field>
          <Field label="End date">
            <input className={inputCls} type="date" value={examForm.endDate} onChange={(e) => setExamForm((f) => ({ ...f, endDate: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea className={inputCls} rows={2} value={examForm.description} onChange={(e) => setExamForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
          </div>
        </div>
        <button
          onClick={submitExam}
          disabled={createExam.isPending}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createExam.isPending ? 'Creating…' : 'Create Exam'}
        </button>
      </Modal>

      <Modal open={!!detail} title="Exam Details" onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-slate-900">{detail.name}</p>
                <p className="text-xs text-slate-500">
                  {detail.examType.replace('_', ' ')} · {detail.className ?? className(detail.classId)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {detail.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Closed</Badge>}
                <button
                  onClick={() => generateResults.mutate(detail.id)}
                  disabled={generateResults.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                  title="Generate results and rankings from entered marks"
                >
                  <Trophy className="h-3.5 w-3.5" /> Generate Results
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Schedules <span className="ml-1 font-normal text-slate-400">({schedules.length})</span>
              </h4>
              <button
                onClick={() => setScheduleOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add Schedule
              </button>
            </div>

            <div className="space-y-2">
              {schedules.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                  No schedules yet. Add one to set up a subject's exam.
                </p>
              )}
              {schedules.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">{subjectName(s.subjectId)}</p>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" /> {s.date ? new Date(s.date).toLocaleDateString() : '—'}
                  </span>
                  {s.startTime && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" /> {s.startTime}{s.endTime ? `–${s.endTime}` : ''}
                    </span>
                  )}
                  {s.roomNumber && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <DoorOpen className="h-3.5 w-3.5" /> Room {s.roomNumber}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">Max {s.maxMarks} · Pass {s.passMarks}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => openMarks(s.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        marksScheduleId === s.id
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {marksScheduleId === s.id ? 'Entering marks…' : 'Enter Marks'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Remove this schedule?')) deleteSchedule.mutate(s.id)
                      }}
                      className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {marksScheduleId && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-indigo-900">
                    Marks — {subjectName(schedules.find((s) => s.id === marksScheduleId)?.subjectId ?? null)}
                  </h4>
                  <button
                    onClick={saveMarks}
                    disabled={bulkMarks.isPending || marksQuery.isLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" /> {bulkMarks.isPending ? 'Saving…' : 'Save Marks'}
                  </button>
                </div>
                {marksQuery.isLoading ? (
                  <div className="flex justify-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (marksQuery.data ?? []).length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">
                    No students enrolled in this class for the exam. Add students to the class first.
                  </p>
                ) : (
                  <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
                    {(marksQuery.data ?? []).map((m) => {
                      const max = m.maxMarks || schedules.find((s) => s.id === marksScheduleId)?.maxMarks || 100
                      const absent = absentDraft[m.studentId] ?? m.isAbsent
                      return (
                        <div key={m.studentId} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2">
                          <span className="font-mono text-[11px] text-slate-400">{m.rollNumber ?? m.admissionNumber ?? ''}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{m.firstName} {m.lastName}</span>
                          <label className="flex items-center gap-1 text-xs text-slate-500">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-300 text-red-500"
                              checked={absent}
                              onChange={(e) => {
                                setAbsentDraft((d) => ({ ...d, [m.studentId]: e.target.checked }))
                                if (e.target.checked) setMarksDraft((d) => ({ ...d, [m.studentId]: '' }))
                              }}
                            />
                            Absent
                          </label>
                          <input
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-100 disabled:text-slate-400"
                            type="number"
                            min={0}
                            max={max}
                            disabled={absent}
                            placeholder={String(max)}
                            value={marksDraft[m.studentId] ?? (m.marksObtained != null ? String(m.marksObtained) : '')}
                            onChange={(e) => setMarksDraft((d) => ({ ...d, [m.studentId]: e.target.value }))}
                          />
                          <span className="w-10 text-xs text-slate-400">/ {max}</span>
                          {m.grade && <span className="w-10 text-xs font-medium text-indigo-600">{m.grade}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4">
              <span className="text-sm text-slate-600">Delete this exam and all its schedules?</span>
              <button
                onClick={() => {
                  if (window.confirm(`Delete exam "${detail.name}"?`)) deleteExam.mutate(detail.id)
                }}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Delete Exam
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={scheduleOpen} title="Add Schedule" onClose={() => setScheduleOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subject" required>
            <select className={inputCls} value={scheduleForm.subjectId} onChange={(e) => setScheduleForm((f) => ({ ...f, subjectId: e.target.value }))}>
              <option value="">Select…</option>
              {(subjectsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Date" required>
            <input className={inputCls} type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))} />
          </Field>
          <Field label="Start time">
            <input className={inputCls} type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm((f) => ({ ...f, startTime: e.target.value }))} />
          </Field>
          <Field label="End time">
            <input className={inputCls} type="time" value={scheduleForm.endTime} onChange={(e) => setScheduleForm((f) => ({ ...f, endTime: e.target.value }))} />
          </Field>
          <Field label="Max marks">
            <input className={inputCls} type="number" value={scheduleForm.maxMarks} onChange={(e) => setScheduleForm((f) => ({ ...f, maxMarks: e.target.value }))} />
          </Field>
          <Field label="Pass marks">
            <input className={inputCls} type="number" value={scheduleForm.passMarks} onChange={(e) => setScheduleForm((f) => ({ ...f, passMarks: e.target.value }))} />
          </Field>
          <Field label="Room number">
            <input className={inputCls} value={scheduleForm.roomNumber} onChange={(e) => setScheduleForm((f) => ({ ...f, roomNumber: e.target.value }))} />
          </Field>
        </div>
        <button
          onClick={submitSchedule}
          disabled={createSchedule.isPending}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createSchedule.isPending ? 'Adding…' : 'Add Schedule'}
        </button>
      </Modal>
    </div>
  )
}
