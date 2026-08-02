import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Phone,
  Mail,
  UserRound,
} from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Student, StudentAcademicRecord, ClassRecord, AcademicYear, Section, ParentContact } from '../lib/types'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

function Badge({ children, tone = 'indigo' }: { children: React.ReactNode; tone?: 'indigo' | 'green' | 'slate' | 'red' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

export default function Students() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<Student | null>(null)

  const classesQuery = useQuery({
    queryKey: ['classes', branchId],
    queryFn: () => unwrap<ClassRecord[]>(api.get(`/branches/${branchId}/classes`)),
    enabled: !!branchId,
  })
  const yearsQuery = useQuery({
    queryKey: ['academic-years', branchId],
    queryFn: () => unwrap<AcademicYear[]>(api.get(`/branches/${branchId}/academic-years`)),
    enabled: !!branchId,
  })

  const listQuery = useQuery({
    queryKey: ['students', branchId, search, classFilter, statusFilter, page],
    queryFn: () =>
      api.get(`/branches/${branchId}/students`, {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          classId: classFilter || undefined,
          status: statusFilter || undefined,
        },
      }),
    select: (res) => {
      const body = res.data as { data: Student[]; pagination: { page: number; limit: number; total: number } }
      return { rows: body.data, pagination: body.pagination }
    },
    enabled: !!branchId,
  })

  const recordsQuery = useQuery({
    queryKey: ['students-records', branchId, (listQuery.data?.rows ?? []).map((s) => s.id).join(',')],
    queryFn: async () => {
      const rows = listQuery.data?.rows ?? []
      const entries = await Promise.all(
        rows.map(async (s) => {
          try {
            const recs = await unwrap<StudentAcademicRecord[]>(api.get(`/students/${s.id}/academic-records`))
            return [s.id, recs] as const
          } catch {
            return [s.id, []] as const
          }
        }),
      )
      return Object.fromEntries(entries) as Record<string, StudentAcademicRecord[]>
    },
    enabled: !!listQuery.data?.rows && listQuery.data.rows.length > 0,
  })

  const classNames = (s: Student): string => {
    const recs = recordsQuery.data?.[s.id] ?? []
    const names = recs.map((r) => classesQuery.data?.find((c) => c.id === r.classId)?.name).filter(Boolean)
    return names.length ? names.join(', ') : '—'
  }

  const sectionNames = (s: Student): string => {
    const recs = recordsQuery.data?.[s.id] ?? []
    const latest = recs[recs.length - 1]
    if (!latest?.sectionId) return ''
    const sections = sectionsQuery.data?.[latest.classId] ?? []
    return sections.find((x) => x.id === latest.sectionId)?.name ?? ''
  }

  const sectionsQuery = useQuery({
    queryKey: ['sections', branchId],
    queryFn: async () => {
      const rows = classesQuery.data ?? []
      const entries = await Promise.all(
        rows.map(async (c) => [c.id, await unwrap<Section[]>(api.get(`/classes/${c.id}/sections`))] as const),
      )
      return Object.fromEntries(entries) as Record<string, Section[]>
    },
    enabled: !!classesQuery.data && classesQuery.data.length > 0,
  })

  // ---- Create ----
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    bloodGroup: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    classId: '',
    sectionId: '',
    academicYearId: '',
    admissionDate: '',
  })

  const createStudent = useMutation({
    mutationFn: (body: Record<string, string>) => unwrap<Student>(api.post('/students', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setCreateOpen(false)
      setForm({
        firstName: '',
        lastName: '',
        middleName: '',
        gender: '',
        dateOfBirth: '',
        phone: '',
        email: '',
        bloodGroup: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        classId: '',
        sectionId: '',
        academicYearId: '',
        admissionDate: '',
      })
      setInfo('Student created')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  // ---- Detail ----
  const parentsQuery = useQuery({
    queryKey: ['student-parents', detail?.id],
    queryFn: () => unwrap<ParentContact[]>(api.get(`/students/${detail!.id}/parents`)),
    enabled: !!detail,
  })

  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ leavingDate: '', leavingReason: '' })
  const withdrawStudent = useMutation({
    mutationFn: () => unwrap<Student>(api.post(`/students/${detail!.id}/withdraw`, withdrawForm)),
    onSuccess: () => {
      setWithdrawOpen(false)
      setWithdrawForm({ leavingDate: '', leavingReason: '' })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['student-parents'] })
      setDetail((d) => (d ? { ...d, status: 'left', isActive: false } : d))
      setInfo('Student withdrawn')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submit = () => {
    setError(null)
    setInfo(null)
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required')
      return
    }
    const body: Record<string, string> = {}
    for (const [k, v] of Object.entries(form)) {
      if (v.trim()) body[k] = v.trim()
    }
    createStudent.mutate(body)
  }

  const total = listQuery.data?.pagination.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  if (!branchId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        No branch is assigned to your account. Contact your administrator.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Students</h2>
          <p className="text-sm text-slate-500">
            {total} student(s) enrolled
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Student
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
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search by name or admission number…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <select className={`${inputCls} w-auto`} value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1) }}>
          <option value="">All classes</option>
          {(classesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className={`${inputCls} w-auto`} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="left">Left</option>
          <option value="suspended">Suspended</option>
          <option value="expelled">Expelled</option>
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
                <th className="px-4 py-3">Admission</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contact</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data?.rows ?? []).map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/40"
                  onClick={() => setDetail(s)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.admissionNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {s.firstName} {s.middleName && `${s.middleName} `}{s.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {classNames(s)}
                    {sectionNames(s) && <span className="text-slate-400"> · {sectionNames(s)}</span>}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{s.gender ?? '—'}</td>
                  <td className="px-4 py-3">
                    {s.status === 'left' ? <Badge tone="red">Left</Badge> : <Badge tone="green">Active</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.phone ?? '—'}</td>
                </tr>
              ))}
              {(listQuery.data?.rows ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No students match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Modal open={createOpen} title="Add Student" onClose={() => setCreateOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name *">
            <input className={inputCls} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          </Field>
          <Field label="Last name *">
            <input className={inputCls} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </Field>
          <Field label="Middle name">
            <input className={inputCls} value={form.middleName} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} />
          </Field>
          <Field label="Gender">
            <select className={inputCls} value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of birth">
            <input className={inputCls} type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
          </Field>
          <Field label="Blood group">
            <input className={inputCls} placeholder="e.g. B+" value={form.bloodGroup} onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))} />
          </Field>
          <Field label="Class">
            <select className={inputCls} value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value, sectionId: '' }))}>
              <option value="">Select…</option>
              {(classesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Section">
            <select className={inputCls} value={form.sectionId} onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}>
              <option value="">Select…</option>
              {(form.classId ? sectionsQuery.data?.[form.classId] ?? [] : []).map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Academic year">
            <select className={inputCls} value={form.academicYearId} onChange={(e) => setForm((f) => ({ ...f, academicYearId: e.target.value }))}>
              <option value="">Select…</option>
              {(yearsQuery.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (current)' : ''}</option>
              ))}
            </select>
          </Field>
          <Field label="Admission date">
            <input className={inputCls} type="date" value={form.admissionDate} onChange={(e) => setForm((f) => ({ ...f, admissionDate: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} placeholder="e.g. 9876543210" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" placeholder="student@school.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Address">
            <input className={inputCls} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </Field>
          <Field label="City">
            <input className={inputCls} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </Field>
          <Field label="State">
            <input className={inputCls} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          </Field>
          <Field label="Pincode">
            <input className={inputCls} value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} />
          </Field>
        </div>
        <button
          onClick={submit}
          disabled={createStudent.isPending}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createStudent.isPending ? 'Creating…' : 'Create Student'}
        </button>
      </Modal>

      <Modal open={!!detail} title="Student Details" onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
                {detail.firstName[0]}
                {detail.lastName[0]}
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900">
                  {detail.firstName} {detail.middleName && `${detail.middleName} `}{detail.lastName}
                </p>
                <p className="font-mono text-xs text-slate-500">Admission: {detail.admissionNumber}</p>
              </div>
              <div className="ml-auto">
                {detail.status === 'left' ? <Badge tone="red">Withdrawn</Badge> : <Badge tone="green">Active</Badge>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Personal</h4>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Gender</dt><dd className="capitalize">{detail.gender ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Date of birth</dt><dd>{detail.dateOfBirth ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Blood group</dt><dd>{detail.bloodGroup ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Admitted</dt><dd>{detail.admissionDate ?? '—'}</dd></div>
                  {detail.leavingDate && (
                    <div className="flex justify-between"><dt className="text-slate-500">Left on</dt><dd>{detail.leavingDate}</dd></div>
                  )}
                </dl>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Contact &amp; Address</h4>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /><dd>{detail.phone ?? '—'}</dd></div>
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /><dd>{detail.email ?? '—'}</dd></div>
                  <dd className="pt-1 text-slate-600">
                    {[detail.address, detail.city, detail.state, detail.pincode].filter(Boolean).join(', ') || '—'}
                  </dd>
                </dl>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <GraduationCap className="h-3.5 w-3.5" /> Academic records
              </h4>
              {(recordsQuery.data?.[detail.id] ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No academic records.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-4">Academic year</th>
                      <th className="py-2 pr-4">Class</th>
                      <th className="py-2 pr-4">Section</th>
                      <th className="py-2 pr-4">Roll no</th>
                      <th className="py-2">Promoted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recordsQuery.data?.[detail.id] ?? []).map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-4">{yearsQuery.data?.find((y) => y.id === r.academicYearId)?.name ?? '—'}</td>
                        <td className="py-2 pr-4">{classesQuery.data?.find((c) => c.id === r.classId)?.name ?? '—'}</td>
                        <td className="py-2 pr-4">{sectionsQuery.data?.[r.classId]?.find((x) => x.id === r.sectionId)?.name ?? '—'}</td>
                        <td className="py-2 pr-4">{r.rollNumber ?? '—'}</td>
                        <td className="py-2">{r.isPromoted ? <Badge tone="green">Yes</Badge> : <Badge tone="slate">No</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <UserRound className="h-3.5 w-3.5" /> Parents / Guardians
              </h4>
              {(parentsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No parents linked.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(parentsQuery.data ?? []).map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{p.name ?? '—'}</p>
                        <p className="text-xs text-slate-500">
                          {p.relationship} · {p.occupation ?? ''}
                        </p>
                      </div>
                      <span className="text-xs text-slate-600">{p.phone}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {detail.status !== 'left' && (
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">Withdraw student</h4>
                {!withdrawOpen ? (
                  <button
                    onClick={() => setWithdrawOpen(true)}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Withdraw…
                  </button>
                ) : (
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Leaving date">
                      <input className={inputCls} type="date" value={withdrawForm.leavingDate} onChange={(e) => setWithdrawForm((f) => ({ ...f, leavingDate: e.target.value }))} />
                    </Field>
                    <Field label="Reason">
                      <input className={inputCls} value={withdrawForm.leavingReason} onChange={(e) => setWithdrawForm((f) => ({ ...f, leavingReason: e.target.value }))} />
                    </Field>
                    <button
                      onClick={() => {
                        setError(null)
                        if (!withdrawForm.leavingDate) {
                          setError('Leaving date is required')
                          return
                        }
                        withdrawStudent.mutate()
                      }}
                      disabled={withdrawStudent.isPending}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {withdrawStudent.isPending ? 'Withdrawing…' : 'Confirm withdrawal'}
                    </button>
                    <button
                      onClick={() => setWithdrawOpen(false)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
