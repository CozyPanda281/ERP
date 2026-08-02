import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, FileText, CalendarClock, CheckCircle2, Clock } from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { ClassRecord, Subject } from '../lib/types'

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

interface Homework {
  id: string
  classId: string
  sectionId: string | null
  subjectId: string
  teacherId: string
  title: string
  description: string | null
  dueDate: string | null
  maxMarks: number | null
  isMandatory: boolean
  createdAt: string | null
}

interface Submission {
  id: string
  homeworkId: string
  studentId: string
  submissionText: string | null
  attachmentUrls: unknown[] | null
  isLate: boolean
  status: string
  marksObtained: string | null
  feedback: string | null
  gradedAt: string | null
  submittedAt: string | null
}

interface StaffMember {
  id: string
  userId: string | null
  firstName: string
  lastName: string
  designation: string | null
  isTeaching: boolean
}

interface Student {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string | null
  rollNumber: string | null
}

const EMPTY = {
  classId: '',
  sectionId: '',
  subjectId: '',
  teacherId: '',
  title: '',
  description: '',
  dueDate: '',
  maxMarks: '',
  isMandatory: true,
}

export default function Homework() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [classFilter, setClassFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [detail, setDetail] = useState<Homework | null>(null)
  const [gradeInput, setGradeInput] = useState<Record<string, { marks: string; feedback: string }>>({})

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

  const staffQuery = useQuery({
    queryKey: ['staff', branchId],
    queryFn: () => api.get('/staff', { params: { page: 1, limit: 100 } }),
    select: (res) => ((res.data as { data: StaffMember[] }).data ?? []).filter((s) => s.isTeaching),
    enabled: !!branchId,
  })

  const sectionsQuery = useQuery({
    queryKey: ['sections', form.classId],
    queryFn: () => unwrap<{ id: string; name: string }[]>(api.get(`/classes/${form.classId}/sections`)),
    select: (d) => (Array.isArray(d) ? d : []),
    enabled: !!form.classId,
  })

  const listQuery = useQuery({
    queryKey: ['homework', branchId, classFilter, subjectFilter],
    queryFn: () =>
      api.get('/homework', {
        params: { page: 1, limit: 100, classId: classFilter || undefined, subjectId: subjectFilter || undefined },
      }),
    select: (res) => (res.data as { data: Homework[] }).data ?? [],
    enabled: !!branchId,
  })

  const submissionsQuery = useQuery({
    queryKey: ['homework-submissions', detail?.id],
    queryFn: () => unwrap<Submission[]>(api.get(`/homework/${detail!.id}/submissions`)),
    select: (d) => (Array.isArray(d) ? d : []),
    enabled: !!detail,
  })

  const studentsQuery = useQuery({
    queryKey: ['students-by-class', detail?.classId],
    queryFn: () =>
      api.get('/students', { params: { page: 1, limit: 200, classId: detail!.classId } }),
    select: (res) => ((res.data as { data: Student[] }).data ?? []) as Student[],
    enabled: !!detail,
  })

  const createHw = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<Homework>(api.post('/homework', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] })
      setCreateOpen(false)
      setForm(EMPTY)
      setInfo('Homework assigned')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const gradeSub = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { marksObtained: string; feedback?: string } }) =>
      unwrap<Submission>(api.put(`/homework/submissions/${id}/grade`, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-submissions'] })
      setInfo('Submission graded')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submit = () => {
    setError(null)
    setInfo(null)
    if (!form.classId || !form.subjectId || !form.teacherId || !form.title.trim() || !form.dueDate) {
      setError('Class, subject, teacher, title and due date are required')
      return
    }
    createHw.mutate({
      classId: form.classId,
      sectionId: form.sectionId || undefined,
      subjectId: form.subjectId,
      teacherId: form.teacherId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      dueDate: form.dueDate,
      maxMarks: form.maxMarks ? Number(form.maxMarks) : undefined,
      isMandatory: form.isMandatory,
    })
  }

  const className = (id: string) => classesQuery.data?.find((c) => c.id === id)?.name ?? '—'
  const subjectName = (id: string) => subjectsQuery.data?.find((s) => s.id === id)?.name ?? '—'
  const teacherName = (id: string) => {
    const t = staffQuery.data?.find((s) => s.id === id)
    return t ? `${t.firstName} ${t.lastName}` : '—'
  }
  const studentName = (id: string) => {
    const s = studentsQuery.data?.find((st) => st.id === id)
    return s ? `${s.firstName} ${s.lastName}` : id.slice(0, 8)
  }
  const submissions = submissionsQuery.data ?? []

  const openDetail = (hw: Homework) => {
    setGradeInput({})
    setDetail(hw)
  }

  const doGrade = (sub: Submission) => {
    setError(null)
    setInfo(null)
    const g = gradeInput[sub.id]
    if (!g?.marks) {
      setError('Enter marks to grade this submission')
      return
    }
    gradeSub.mutate({
      id: sub.id,
      body: { marksObtained: g.marks, feedback: g.feedback || undefined },
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Homework</h2>
          <p className="text-sm text-slate-500">{listQuery.data?.length ?? 0} assignment(s)</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Assign Homework
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
        <select className={`${inputCls} w-auto`} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {(classesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className={`${inputCls} w-auto`} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="">All subjects</option>
          {(subjectsQuery.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
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
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Marks</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((hw) => {
                const overdue = hw.dueDate && new Date(hw.dueDate) < new Date()
                return (
                  <tr
                    key={hw.id}
                    className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/40"
                    onClick={() => openDetail(hw)}
                  >
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-medium text-slate-900">
                        <FileText className="h-4 w-4 text-indigo-400" /> {hw.title}
                      </p>
                      {hw.description && <p className="max-w-xs truncate text-xs text-slate-400">{hw.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{className(hw.classId)}</td>
                    <td className="px-4 py-3 text-slate-600">{subjectName(hw.subjectId)}</td>
                    <td className="px-4 py-3 text-slate-600">{teacherName(hw.teacherId)}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs ${overdue ? 'font-medium text-red-600' : 'text-slate-600'}`}>
                        {overdue ? <Clock className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                        {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{hw.maxMarks ?? '—'}</td>
                    <td className="px-4 py-3">{hw.isMandatory ? <Badge tone="amber">Mandatory</Badge> : <Badge tone="slate">Optional</Badge>}</td>
                  </tr>
                )
              })}
              {(listQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">No homework yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={createOpen} title="Assign Homework" onClose={() => setCreateOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Class" required>
            <select
              className={inputCls}
              value={form.classId}
              onChange={(e) => {
                setForm((f) => ({ ...f, classId: e.target.value, sectionId: '' }))
              }}
            >
              <option value="">Select…</option>
              {(classesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Section">
            <select className={inputCls} value={form.sectionId} onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}>
              <option value="">All sections</option>
              {(sectionsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject" required>
            <select className={inputCls} value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}>
              <option value="">Select…</option>
              {(subjectsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Teacher" required>
            <select className={inputCls} value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}>
              <option value="">Select…</option>
              {(staffQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName} — {t.designation ?? 'Teacher'}</option>
              ))}
            </select>
          </Field>
          <Field label="Title" required>
            <input className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Due date" required>
            <input className={inputCls} type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </Field>
          <Field label="Max marks">
            <input className={inputCls} type="number" value={form.maxMarks} onChange={(e) => setForm((f) => ({ ...f, maxMarks: e.target.value }))} />
          </Field>
          <label className="flex items-end gap-1.5 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              checked={form.isMandatory}
              onChange={(e) => setForm((f) => ({ ...f, isMandatory: e.target.checked }))}
            />
            Mandatory
          </label>
          <div className="sm:col-span-2">
            <Field label="Instructions">
              <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
          </div>
        </div>
        <button
          onClick={submit}
          disabled={createHw.isPending}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createHw.isPending ? 'Assigning…' : 'Assign Homework'}
        </button>
      </Modal>

      <Modal open={!!detail} title="Homework Details" onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-slate-900">{detail.title}</p>
                <p className="text-xs text-slate-500">
                  {className(detail.classId)} · {subjectName(detail.subjectId)} · {teacherName(detail.teacherId)}
                </p>
                {detail.description && <p className="mt-2 text-sm text-slate-600">{detail.description}</p>}
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                  <CalendarClock className="h-3.5 w-3.5" /> Due {detail.dueDate ? new Date(detail.dueDate).toLocaleDateString() : '—'}
                </p>
                {detail.maxMarks && <p className="mt-1 text-xs text-slate-500">Max {detail.maxMarks} marks</p>}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">
                Submissions <span className="ml-1 font-normal text-slate-400">({submissions.length})</span>
              </h4>
              {submissions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                  No submissions yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub) => {
                    const graded = sub.status === 'graded'
                    return (
                      <div key={sub.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-medium text-slate-900">{studentName(sub.studentId)}</span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            {sub.isLate ? <Clock className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                            {sub.isLate ? 'Late' : 'On time'} · {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : ''}
                          </span>
                          {graded ? (
                            <Badge tone="green">Graded: {sub.marksObtained}</Badge>
                          ) : (
                            <Badge tone="amber">Pending</Badge>
                          )}
                          <div className="ml-auto flex items-center gap-2">
                            {!graded && (
                              <>
                                <input
                                  className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm"
                                  type="number"
                                  placeholder={detail.maxMarks ? `Max ${detail.maxMarks}` : 'Marks'}
                                  value={gradeInput[sub.id]?.marks ?? ''}
                                  onChange={(e) =>
                                    setGradeInput((g) => ({ ...g, [sub.id]: { marks: e.target.value, feedback: g[sub.id]?.feedback ?? '' } }))
                                  }
                                />
                                <input
                                  className="w-36 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                                  placeholder="Feedback…"
                                  value={gradeInput[sub.id]?.feedback ?? ''}
                                  onChange={(e) =>
                                    setGradeInput((g) => ({ ...g, [sub.id]: { marks: g[sub.id]?.marks ?? '', feedback: e.target.value } }))
                                  }
                                />
                                <button
                                  onClick={() => doGrade(sub)}
                                  disabled={gradeSub.isPending}
                                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  Grade
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {sub.submissionText && <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">{sub.submissionText}</p>}
                        {graded && sub.feedback && (
                          <p className="mt-2 text-xs italic text-slate-500">Feedback: {sub.feedback}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
