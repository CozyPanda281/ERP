import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Star,
  BookOpen,
  Users,
  Building2,
} from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { AcademicYear, ClassRecord, Section, Subject, Department } from '../lib/types'

function fmtDate(v: string | null): string {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

function SectionCard({
  icon,
  title,
  subtitle,
  actions,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
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

function Badge({ children, tone = 'indigo' }: { children: React.ReactNode; tone?: 'indigo' | 'green' | 'slate' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

export default function Classes() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const yearsQuery = useQuery({
    queryKey: ['academic-years', branchId],
    queryFn: () => unwrap<AcademicYear[]>(api.get(`/branches/${branchId}/academic-years`)),
    enabled: !!branchId,
  })
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
  const departmentsQuery = useQuery({
    queryKey: ['departments', branchId],
    queryFn: () => unwrap<Department[]>(api.get(`/branches/${branchId}/departments`)),
    enabled: !!branchId,
  })

  const sectionQueries = useQuery({
    queryKey: ['sections', branchId],
    queryFn: async () => {
      const rows = classesQuery.data ?? []
      const entries = await Promise.all(
        rows.map(async (c) => [c.id, await unwrap<Section[]>(api.get(`/classes/${c.id}/sections`))] as const),
      )
      return Object.fromEntries(entries) as Record<string, Section[]>
    },
    enabled: !!branchId && !!classesQuery.data && classesQuery.data.length > 0,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['academic-years'] })
    queryClient.invalidateQueries({ queryKey: ['classes'] })
    queryClient.invalidateQueries({ queryKey: ['subjects'] })
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    queryClient.invalidateQueries({ queryKey: ['sections'] })
  }

  const show = (fn: () => void) => {
    setError(null)
    setInfo(null)
    try {
      fn()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  // ---- Academic year ----
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false })
  const createYear = useMutation({
    mutationFn: (body: typeof yearForm) => unwrap<AcademicYear>(api.post('/academic-years', { ...body, branchId })),
    onSuccess: () => {
      invalidateAll()
      setYearForm({ name: '', startDate: '', endDate: '', isCurrent: false })
      setInfo('Academic year created')
    },
    onError: (e) => setError(errorMessage(e)),
  })
  const setCurrentYear = useMutation({
    mutationFn: (id: string) =>
      unwrap<AcademicYear>(api.put(`/academic-years/${id}/set-current`, { branchId })),
    onSuccess: () => {
      invalidateAll()
      setInfo('Current academic year updated')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  // ---- Class ----
  const [classModal, setClassModal] = useState(false)
  const [classForm, setClassForm] = useState({ name: '', code: '', description: '', displayOrder: '' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sectionModal, setSectionModal] = useState<ClassRecord | null>(null)
  const [sectionForm, setSectionForm] = useState({ name: '', code: '', capacity: '', roomNumber: '' })

  const createClass = useMutation({
    mutationFn: (body: { name: string; code?: string; description?: string; displayOrder?: number }) =>
      unwrap<ClassRecord>(api.post('/classes', { ...body, branchId })),
    onSuccess: () => {
      invalidateAll()
      setClassModal(false)
      setClassForm({ name: '', code: '', description: '', displayOrder: '' })
      setInfo('Class created')
    },
    onError: (e) => setError(errorMessage(e)),
  })
  const deleteClass = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/classes/${id}`)),
    onSuccess: () => {
      invalidateAll()
      setInfo('Class deleted')
    },
    onError: (e) => setError(errorMessage(e)),
  })
  const createSection = useMutation({
    mutationFn: (body: { classId: string; name: string; code?: string; capacity?: number; roomNumber?: string }) =>
      unwrap<Section>(api.post('/sections', { ...body, branchId })),
    onSuccess: () => {
      invalidateAll()
      setSectionModal(null)
      setSectionForm({ name: '', code: '', capacity: '', roomNumber: '' })
      setInfo('Section created')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  // ---- Subject ----
  const [subjectModal, setSubjectModal] = useState(false)
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', subjectType: '', isLanguage: false })
  const createSubject = useMutation({
    mutationFn: (body: { name: string; code?: string; subjectType?: string; isLanguage?: boolean }) =>
      unwrap<Subject>(api.post('/subjects', { ...body, branchId })),
    onSuccess: () => {
      invalidateAll()
      setSubjectModal(false)
      setSubjectForm({ name: '', code: '', subjectType: '', isLanguage: false })
      setInfo('Subject created')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  // ---- Department ----
  const [deptModal, setDeptModal] = useState(false)
  const [deptForm, setDeptForm] = useState({ name: '', code: '' })
  const createDepartment = useMutation({
    mutationFn: (body: { name: string; code?: string }) => unwrap<Department>(api.post('/departments', { ...body, branchId })),
    onSuccess: () => {
      invalidateAll()
      setDeptModal(false)
      setDeptForm({ name: '', code: '' })
      setInfo('Department created')
    },
    onError: (e) => setError(errorMessage(e)),
  })
  const deleteDepartment = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/departments/${id}`)),
    onSuccess: () => {
      invalidateAll()
      setInfo('Department deleted')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!branchId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        No branch is assigned to your account. Contact your administrator.
      </div>
    )
  }

  const loading = yearsQuery.isLoading || classesQuery.isLoading || subjectsQuery.isLoading

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Classes &amp; Subjects</h2>
          <p className="text-sm text-slate-500">Academic structure for your branch</p>
        </div>
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

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <SectionCard
            icon={<CalendarDays className="h-4.5 w-4.5" />}
            title="Academic Years"
            subtitle={`${yearsQuery.data?.length ?? 0} year(s)`}
          >
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  className={inputCls}
                  placeholder="e.g. 2026-2027"
                  value={yearForm.name}
                  onChange={(e) => setYearForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className={inputCls}
                  type="date"
                  value={yearForm.startDate}
                  onChange={(e) => setYearForm((f) => ({ ...f, startDate: e.target.value }))}
                />
                <input
                  className={inputCls}
                  type="date"
                  value={yearForm.endDate}
                  onChange={(e) => setYearForm((f) => ({ ...f, endDate: e.target.value }))}
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      checked={yearForm.isCurrent}
                      onChange={(e) => setYearForm((f) => ({ ...f, isCurrent: e.target.checked }))}
                    />
                    Current
                  </label>
                  <button
                    onClick={() =>
                      show(() => {
                        if (!yearForm.name || !yearForm.startDate || !yearForm.endDate) {
                          setError('Name, start date and end date are required')
                          return
                        }
                        createYear.mutate(yearForm)
                      })
                    }
                    disabled={createYear.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createYear.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Start</th>
                      <th className="py-2 pr-4">End</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(yearsQuery.data ?? []).map((y) => (
                      <tr key={y.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{y.name}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{fmtDate(y.startDate)}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{fmtDate(y.endDate)}</td>
                        <td className="py-2.5 pr-4">
                          {y.isCurrent ? <Badge tone="green">Current</Badge> : <Badge tone="slate">Inactive</Badge>}
                        </td>
                        <td className="py-2.5 text-right">
                          {!y.isCurrent && (
                            <button
                              onClick={() => setCurrentYear.mutate(y.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              <Star className="h-3.5 w-3.5" /> Set current
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(yearsQuery.data ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No academic years yet — add one above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={<Users className="h-4.5 w-4.5" />}
            title="Classes"
            subtitle={`${classesQuery.data?.length ?? 0} class(es)`}
            actions={
              <button
                onClick={() => setClassModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Add Class
              </button>
            }
          >
            <div className="space-y-2">
              {(classesQuery.data ?? []).map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleExpanded(c.id)}
                      className="text-slate-400 hover:text-slate-600"
                      aria-label="Toggle sections"
                    >
                      {expanded.has(c.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {c.name}
                        {c.code && <span className="ml-2 font-mono text-xs text-slate-400">{c.code}</span>}
                      </p>
                      {c.description && <p className="truncate text-xs text-slate-500">{c.description}</p>}
                    </div>
                    <span className="text-xs text-slate-400">
                      {(sectionQueries.data?.[c.id] ?? []).length} section(s)
                    </span>
                    <button
                      onClick={() => setSectionModal(c)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      + Section
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete class "${c.name}"?`)) deleteClass.mutate(c.id)
                      }}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Delete class"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {expanded.has(c.id) && (
                    <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
                      {(sectionQueries.data?.[c.id] ?? []).length === 0 ? (
                        <p className="py-2 text-xs text-slate-400">No sections.</p>
                      ) : (
                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {(sectionQueries.data?.[c.id] ?? []).map((s) => (
                            <li key={s.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                              <span className="font-medium text-slate-800">{s.name}</span>
                              {s.roomNumber && <span className="ml-2 text-xs text-slate-400">Room {s.roomNumber}</span>}
                              <span className="ml-auto block text-xs text-slate-400">
                                {s.capacity ? `Capacity ${s.capacity}` : 'No capacity set'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {(classesQuery.data ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">No classes yet — add one.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={<BookOpen className="h-4.5 w-4.5" />}
            title="Subjects"
            subtitle={`${subjectsQuery.data?.length ?? 0} subject(s)`}
            actions={
              <button
                onClick={() => setSubjectModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Add Subject
              </button>
            }
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(subjectsQuery.data ?? []).map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{s.name}</p>
                    {s.isLanguage && <Badge>Language</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {s.code ?? '—'}
                    {s.subjectType ? ` · ${s.subjectType}` : ''}
                  </p>
                </div>
              ))}
            </div>
            {(subjectsQuery.data ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No subjects yet — add one.</p>
            )}
          </SectionCard>

          <SectionCard
            icon={<Building2 className="h-4.5 w-4.5" />}
            title="Departments"
            subtitle={`${departmentsQuery.data?.length ?? 0} department(s)`}
            actions={
              <button
                onClick={() => setDeptModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Add Department
              </button>
            }
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(departmentsQuery.data ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{d.name}</p>
                    {d.code && <p className="text-xs text-slate-500">{d.code}</p>}
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete department "${d.name}"?`)) deleteDepartment.mutate(d.id)
                    }}
                    className="text-slate-400 hover:text-red-500"
                    aria-label="Delete department"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {(departmentsQuery.data ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No departments yet — add one.</p>
            )}
          </SectionCard>
        </>
      )}

      <Modal open={classModal} title="Add Class" onClose={() => setClassModal(false)}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Name (e.g. Grade 10)" value={classForm.name} onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} placeholder="Code (e.g. G10)" value={classForm.code} onChange={(e) => setClassForm((f) => ({ ...f, code: e.target.value }))} />
          <input className={inputCls} placeholder="Description (optional)" value={classForm.description} onChange={(e) => setClassForm((f) => ({ ...f, description: e.target.value }))} />
          <input
            className={inputCls}
            type="number"
            placeholder="Display order (optional)"
            value={classForm.displayOrder}
            onChange={(e) => setClassForm((f) => ({ ...f, displayOrder: e.target.value }))}
          />
          <button
            onClick={() =>
              show(() => {
                if (!classForm.name.trim()) {
                  setError('Class name is required')
                  return
                }
                createClass.mutate({
                  name: classForm.name.trim(),
                  code: classForm.code.trim() || undefined,
                  description: classForm.description.trim() || undefined,
                  displayOrder: classForm.displayOrder ? Number(classForm.displayOrder) : undefined,
                })
              })
            }
            disabled={createClass.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createClass.isPending ? 'Creating…' : 'Create Class'}
          </button>
        </div>
      </Modal>

      <Modal open={!!sectionModal} title={`Add Section to ${sectionModal?.name ?? ''}`} onClose={() => setSectionModal(null)}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Name (e.g. A)" value={sectionForm.name} onChange={(e) => setSectionForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} placeholder="Code (optional)" value={sectionForm.code} onChange={(e) => setSectionForm((f) => ({ ...f, code: e.target.value }))} />
          <input className={inputCls} type="number" placeholder="Capacity (optional)" value={sectionForm.capacity} onChange={(e) => setSectionForm((f) => ({ ...f, capacity: e.target.value }))} />
          <input className={inputCls} placeholder="Room number (optional)" value={sectionForm.roomNumber} onChange={(e) => setSectionForm((f) => ({ ...f, roomNumber: e.target.value }))} />
          <button
            onClick={() =>
              show(() => {
                if (!sectionModal || !sectionForm.name.trim()) {
                  setError('Section name is required')
                  return
                }
                createSection.mutate({
                  classId: sectionModal.id,
                  name: sectionForm.name.trim(),
                  code: sectionForm.code.trim() || undefined,
                  capacity: sectionForm.capacity ? Number(sectionForm.capacity) : undefined,
                  roomNumber: sectionForm.roomNumber.trim() || undefined,
                })
              })
            }
            disabled={createSection.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createSection.isPending ? 'Creating…' : 'Create Section'}
          </button>
        </div>
      </Modal>

      <Modal open={subjectModal} title="Add Subject" onClose={() => setSubjectModal(false)}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Name (e.g. Mathematics)" value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} placeholder="Code (e.g. MATH)" value={subjectForm.code} onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))} />
          <input className={inputCls} placeholder="Type (e.g. Core / Elective)" value={subjectForm.subjectType} onChange={(e) => setSubjectForm((f) => ({ ...f, subjectType: e.target.value }))} />
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              checked={subjectForm.isLanguage}
              onChange={(e) => setSubjectForm((f) => ({ ...f, isLanguage: e.target.checked }))}
            />
            Language subject
          </label>
          <button
            onClick={() =>
              show(() => {
                if (!subjectForm.name.trim()) {
                  setError('Subject name is required')
                  return
                }
                createSubject.mutate({
                  name: subjectForm.name.trim(),
                  code: subjectForm.code.trim() || undefined,
                  subjectType: subjectForm.subjectType.trim() || undefined,
                  isLanguage: subjectForm.isLanguage,
                })
              })
            }
            disabled={createSubject.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createSubject.isPending ? 'Creating…' : 'Create Subject'}
          </button>
        </div>
      </Modal>

      <Modal open={deptModal} title="Add Department" onClose={() => setDeptModal(false)}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Name (e.g. Science)" value={deptForm.name} onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} placeholder="Code (optional)" value={deptForm.code} onChange={(e) => setDeptForm((f) => ({ ...f, code: e.target.value }))} />
          <button
            onClick={() =>
              show(() => {
                if (!deptForm.name.trim()) {
                  setError('Department name is required')
                  return
                }
                createDepartment.mutate({ name: deptForm.name.trim(), code: deptForm.code.trim() || undefined })
              })
            }
            disabled={createDepartment.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createDepartment.isPending ? 'Creating…' : 'Create Department'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
