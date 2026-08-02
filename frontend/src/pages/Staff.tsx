import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, Search, Briefcase, Phone, UserRound } from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Department } from '../lib/types'

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

interface StaffMember {
  id: string
  tenantId: string
  branchId: string
  userId: string | null
  employeeCode: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  gender: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  qualification: string | null
  experienceYears: string | null
  joiningDate: string | null
  employmentType: string | null
  designation: string | null
  departmentId: string | null
  basicSalary: string | null
  bankName: string | null
  isActive: boolean
  isTeaching: boolean
  createdAt?: string | null
}

export default function Staff() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [teachingFilter, setTeachingFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<StaffMember | null>(null)
  const [form, setForm] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    designation: '',
    departmentId: '',
    employmentType: 'full_time',
    joiningDate: '',
    qualification: '',
    experienceYears: '',
    basicSalary: '',
    isTeaching: true,
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments', branchId],
    queryFn: () => unwrap<Department[]>(api.get(`/branches/${branchId}/departments`)),
    enabled: !!branchId,
  })

  const listQuery = useQuery({
    queryKey: ['staff', branchId, search, deptFilter, teachingFilter],
    queryFn: () =>
      api.get('/staff', {
        params: {
          page: 1,
          limit: 50,
          search: search || undefined,
          departmentId: deptFilter || undefined,
          isTeaching: teachingFilter || undefined,
        },
      }),
    select: (res) => {
      const body = res.data as { data: StaffMember[] }
      return body.data
    },
    enabled: !!branchId,
  })

  const createStaff = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<StaffMember>(api.post('/staff', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setCreateOpen(false)
      setForm({
        employeeCode: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: '',
        dateOfBirth: '',
        designation: '',
        departmentId: '',
        employmentType: 'full_time',
        joiningDate: '',
        qualification: '',
        experienceYears: '',
        basicSalary: '',
        isTeaching: true,
      })
      setInfo('Staff member added')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const deleteStaff = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/staff/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setDetail(null)
      setInfo('Staff member removed')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submit = () => {
    setError(null)
    setInfo(null)
    if (!form.employeeCode.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      setError('Employee code, first name and last name are required')
      return
    }
    const body: Record<string, unknown> = { ...form }
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' && !v.trim()) body[k] = undefined
    }
    createStaff.mutate(body)
  }

  const deptName = (id: string | null) => departmentsQuery.data?.find((d) => d.id === id)?.name ?? '—'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Staff</h2>
          <p className="text-sm text-slate-500">{listQuery.data?.length ?? 0} staff member(s)</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Staff
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
            placeholder="Search by name or employee code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={`${inputCls} w-auto`} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {(departmentsQuery.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select className={`${inputCls} w-auto`} value={teachingFilter} onChange={(e) => setTeachingFilter(e.target.value)}>
          <option value="">All staff</option>
          <option value="true">Teaching</option>
          <option value="false">Non-teaching</option>
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
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/40"
                  onClick={() => setDetail(s)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.employeeCode}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{s.firstName} {s.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{s.designation ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{deptName(s.departmentId)}</td>
                  <td className="px-4 py-3">{s.isTeaching ? <Badge tone="indigo">Teaching</Badge> : <Badge tone="slate">Staff</Badge>}</td>
                  <td className="px-4 py-3 text-slate-600">{s.phone ?? s.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    {s.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
                  </td>
                </tr>
              ))}
              {(listQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No staff match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={createOpen} title="Add Staff Member" onClose={() => setCreateOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Employee code *">
            <input className={inputCls} value={form.employeeCode} onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))} />
          </Field>
          <Field label="Employment type">
            <select className={inputCls} value={form.employmentType} onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}>
              {['full_time', 'part_time', 'contract', 'intern', 'temporary'].map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="First name *">
            <input className={inputCls} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          </Field>
          <Field label="Last name *">
            <input className={inputCls} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
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
          <Field label="Designation">
            <input className={inputCls} placeholder="e.g. Science Teacher" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
          </Field>
          <Field label="Department">
            <select className={inputCls} value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
              <option value="">Select…</option>
              {(departmentsQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Joining date">
            <input className={inputCls} type="date" value={form.joiningDate} onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))} />
          </Field>
          <Field label="Qualification">
            <input className={inputCls} placeholder="e.g. M.Sc, B.Ed" value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))} />
          </Field>
          <Field label="Experience (years)">
            <input className={inputCls} type="number" value={form.experienceYears} onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))} />
          </Field>
          <Field label="Basic salary (₹)">
            <input className={inputCls} type="number" value={form.basicSalary} onChange={(e) => setForm((f) => ({ ...f, basicSalary: e.target.value }))} />
          </Field>
          <label className="flex items-end gap-1.5 pb-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              checked={form.isTeaching}
              onChange={(e) => setForm((f) => ({ ...f, isTeaching: e.target.checked }))}
            />
            Teaching staff
          </label>
        </div>
        <button
          onClick={submit}
          disabled={createStaff.isPending}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createStaff.isPending ? 'Adding…' : 'Add Staff Member'}
        </button>
      </Modal>

      <Modal open={!!detail} title="Staff Details" onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
                {detail.firstName[0]}
                {detail.lastName[0]}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  <span className="inline-flex items-center gap-2">
                    {detail.firstName} {detail.lastName}
                    {detail.isTeaching && <Briefcase className="h-4 w-4 text-indigo-400" />}
                  </span>
                </p>
                <p className="font-mono text-xs text-slate-500">Employee: {detail.employeeCode}</p>
              </div>
              <div className="ml-auto">
                {detail.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Employment</h4>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Designation</dt><dd>{detail.designation ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Department</dt><dd>{deptName(detail.departmentId)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="capitalize">{(detail.employmentType ?? '—').replace('_', ' ')}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Joined</dt><dd>{detail.joiningDate ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Qualification</dt><dd>{detail.qualification ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Experience</dt><dd>{detail.experienceYears ? `${detail.experienceYears} yrs` : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Basic salary</dt><dd>{detail.basicSalary ? `₹${Number(detail.basicSalary).toLocaleString('en-IN')}` : '—'}</dd></div>
                </dl>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Personal &amp; Contact</h4>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Gender</dt><dd className="capitalize">{detail.gender ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Date of birth</dt><dd>{detail.dateOfBirth ?? '—'}</dd></div>
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /><dd>{detail.phone ?? '—'}</dd></div>
                  <dd className="pt-1 text-slate-600">{detail.email ?? '—'}</dd>
                  <dd className="pt-1 text-slate-600">
                    {[detail.address, detail.city, detail.state, detail.pincode].filter(Boolean).join(', ') || '—'}
                  </dd>
                </dl>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4">
              <UserRound className="h-4 w-4 text-red-500" />
              <span className="text-sm text-slate-600">Remove this staff member?</span>
              <button
                onClick={() => {
                  if (window.confirm(`Remove ${detail.firstName} ${detail.lastName}?`)) deleteStaff.mutate(detail.id)
                }}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
