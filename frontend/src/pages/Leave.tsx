import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, CheckCircle2, XCircle, CalendarDays } from 'lucide-react'
import { unwrap, unwrapList, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'

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
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className={`my-8 w-full max-w-md rounded-xl bg-white p-6 shadow-xl`}>
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

interface LeaveType {
  id: string
  name: string
  code: string
  daysAllowed: number | null
  isPaid: boolean | null
  carryForward: boolean | null
  maxCarryForward: number | null
}

interface LeaveRequest {
  id: string
  staffId: string
  leaveTypeId: string
  startDate: string | null
  endDate: string | null
  totalDays: number | null
  reason: string | null
  status: string | null
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string | null
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  designation: string | null
}

const EMPTY_REQUEST = {
  staffId: '',
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  totalDays: '',
  reason: '',
}

const EMPTY_TYPE = {
  name: '',
  code: '',
  daysAllowed: '',
  isPaid: true,
  carryForward: false,
  maxCarryForward: '',
}

export default function Leave() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tab, setTab] = useState<'requests' | 'types'>('requests')
  const [statusFilter, setStatusFilter] = useState('')
  const [reqOpen, setReqOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [reqForm, setReqForm] = useState({ ...EMPTY_REQUEST })
  const [typeForm, setTypeForm] = useState({ ...EMPTY_TYPE })
  const [saving, setSaving] = useState(false)

  const staffQuery = useQuery({
    queryKey: ['staff', branchId],
    queryFn: () => api.get('/staff', { params: { page: 1, limit: 200 } }),
    select: (res) => unwrapList<StaffMember>(res),
  })
  const staff = staffQuery.data ?? []

  const typesQuery = useQuery({
    queryKey: ['leave-types', branchId],
    queryFn: () => api.get('/leave/types'),
    select: (res) => unwrapList<LeaveType>(res),
  })
  const leaveTypes = typesQuery.data ?? []

  const requestsQuery = useQuery({
    queryKey: ['leave-requests', branchId, statusFilter],
    queryFn: () =>
      api.get('/leave/requests', {
        params: { page: 1, limit: 100, ...(statusFilter ? { status: statusFilter } : {}) },
      }),
    select: (res) => unwrapList<LeaveRequest>(res),
  })
  const requests = requestsQuery.data ?? []

  const staffName = (id: string) => {
    const s = staff.find((st) => st.id === id)
    return s ? `${s.firstName} ${s.lastName}` : id.slice(0, 8)
  }

  const typeName = (id: string) => leaveTypes.find((t) => t.id === id)?.name ?? id.slice(0, 8)

  const statusTone = (s: string | null): 'green' | 'red' | 'amber' | 'slate' =>
    s === 'approved' ? 'green' : s === 'rejected' ? 'red' : s === 'pending' ? 'amber' : 'slate'

  const createRequest = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/leave/requests', {
          staffId: reqForm.staffId,
          leaveTypeId: reqForm.leaveTypeId,
          startDate: reqForm.startDate,
          endDate: reqForm.endDate,
          totalDays: Number(reqForm.totalDays),
          reason: reqForm.reason || undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      setReqOpen(false)
      setReqForm({ ...EMPTY_REQUEST })
      setInfo('Leave request created')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const createType = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/leave/types', {
          name: typeForm.name,
          code: typeForm.code,
          daysAllowed: Number(typeForm.daysAllowed),
          isPaid: typeForm.isPaid,
          carryForward: typeForm.carryForward,
          maxCarryForward: typeForm.maxCarryForward ? Number(typeForm.maxCarryForward) : undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] })
      setTypeOpen(false)
      setTypeForm({ ...EMPTY_TYPE })
      setInfo('Leave type created')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      unwrap(api.put(`/leave/requests/${id}/${action}`, {})),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      setInfo('Leave request updated')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}
      {info && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">{info}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Leave Management</h1>
          <p className="text-sm text-slate-500">Track leave types and staff requests</p>
        </div>
        <div className="flex gap-2">
          {tab === 'requests' ? (
            <button
              onClick={() => setReqOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> New Request
            </button>
          ) : (
            <button
              onClick={() => setTypeOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> New Leave Type
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
        {(['requests', 'types'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 font-medium capitalize transition ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'requests' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputCls} !w-48`}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {requestsQuery.isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
              No leave requests yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Staff</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Dates</th>
                    <th className="px-4 py-3 font-medium">Days</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{staffName(r.staffId)}</td>
                      <td className="px-4 py-3 text-slate-600">{typeName(r.leaveTypeId)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={13} className="text-slate-400" />
                          {r.startDate ? String(r.startDate).slice(0, 10) : '—'} → {r.endDate ? String(r.endDate).slice(0, 10) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.totalDays ?? '—'}</td>
                      <td className="px-4 py-3"><Badge tone={statusTone(r.status)}>{r.status ?? '—'}</Badge></td>
                      <td className="px-4 py-3">
                        {r.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => decide.mutate({ id: r.id, action: 'approve' })}
                              disabled={decide.isPending}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button
                              onClick={() => decide.mutate({ id: r.id, action: 'reject' })}
                              disabled={decide.isPending}
                              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{r.reason ? String(r.reason).slice(0, 40) : '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Carry Forward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaveTypes.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-3 text-slate-600">{t.code}</td>
                  <td className="px-4 py-3 text-slate-600">{t.daysAllowed ?? '—'}</td>
                  <td className="px-4 py-3"><Badge tone={t.isPaid ? 'green' : 'slate'}>{t.isPaid ? 'Paid' : 'Unpaid'}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{t.carryForward ? `Up to ${t.maxCarryForward ?? '—'} days` : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={reqOpen} title="New Leave Request" onClose={() => setReqOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createRequest.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Staff" required>
            <select
              required
              value={reqForm.staffId}
              onChange={(e) => setReqForm({ ...reqForm, staffId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}{s.designation ? ` (${s.designation})` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Leave Type" required>
            <select
              required
              value={reqForm.leaveTypeId}
              onChange={(e) => setReqForm({ ...reqForm, leaveTypeId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select type</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" required>
              <input
                type="date"
                required
                value={reqForm.startDate}
                onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="End Date" required>
              <input
                type="date"
                required
                value={reqForm.endDate}
                onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Total Days" required>
            <input
              type="number"
              min={1}
              required
              value={reqForm.totalDays}
              onChange={(e) => setReqForm({ ...reqForm, totalDays: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Reason">
            <textarea
              rows={2}
              value={reqForm.reason}
              onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReqOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Create Request
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={typeOpen} title="New Leave Type" onClose={() => setTypeOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createType.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Name" required>
            <input
              required
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              placeholder="e.g. Casual Leave"
              className={inputCls}
            />
          </Field>
          <Field label="Code" required>
            <input
              required
              value={typeForm.code}
              onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
              placeholder="e.g. CL"
              className={inputCls}
            />
          </Field>
          <Field label="Days Allowed" required>
            <input
              type="number"
              min={1}
              required
              value={typeForm.daysAllowed}
              onChange={(e) => setTypeForm({ ...typeForm, daysAllowed: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={typeForm.isPaid}
                onChange={(e) => setTypeForm({ ...typeForm, isPaid: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Paid leave
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={typeForm.carryForward}
                onChange={(e) => setTypeForm({ ...typeForm, carryForward: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Carry forward
            </label>
          </div>
          {typeForm.carryForward && (
            <Field label="Max Carry Forward Days">
              <input
                type="number"
                min={0}
                value={typeForm.maxCarryForward}
                onChange={(e) => setTypeForm({ ...typeForm, maxCarryForward: e.target.value })}
                className={inputCls}
              />
            </Field>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTypeOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Create Type
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
