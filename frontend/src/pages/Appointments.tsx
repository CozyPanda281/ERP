import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Clock,
  MapPin,
  Video,
  Phone,
  User,
  Trash2,
} from 'lucide-react'
import { unwrap, unwrapList, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { primaryRole } from '../lib/nav'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

const STATUS_TONES: Record<string, 'amber' | 'green' | 'red' | 'slate' | 'indigo'> = {
  pending: 'amber',
  confirmed: 'green',
  declined: 'red',
  cancelled: 'red',
  completed: 'indigo',
}

function Badge({ children, tone = 'indigo' }: { children: React.ReactNode; tone?: 'amber' | 'green' | 'red' | 'slate' | 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
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

interface Appointment {
  id: string
  title: string
  description: string | null
  scheduledAt: string
  durationMinutes: number | null
  location: string | null
  mode: string | null
  requestedBy: string
  requestedByRole: string
  requestedByName: string
  participants: Array<{ userId: string | null; parentId: string | null; name: string; role: string }>
  status: string
  cancelledReason: string | null
}

interface StaffMember {
  id: string
  userId: string | null
  firstName: string
  lastName: string
  designation: string | null
  isTeaching: boolean
}

interface ParentRec {
  id: string
  name: string
  relationship: string | null
}

const EMPTY = {
  title: '',
  description: '',
  date: '',
  time: '09:00',
  durationMinutes: '30',
  location: '',
  mode: 'in_person',
}

function fmtDateTime(dt: string): string {
  return new Date(dt).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Appointments() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set())
  const [selectedParents, setSelectedParents] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<Appointment | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const isManager = user?.roles?.includes('principal') || user?.roles?.includes('organization-owner') || !!user?.isSuperAdmin

  const role = primaryRole(user)

  const listQuery = useQuery({
    queryKey: ['appointments', branchId],
    queryFn: () =>
      api.get('/appointments', { params: { branchId: branchId || undefined } }),
    select: (res) => unwrapList<Appointment>(res),
    enabled: !!branchId,
  })

  const staffQuery = useQuery({
    queryKey: ['appointments-staff', branchId],
    queryFn: () => api.get('/staff', { params: { page: 1, limit: 200 } }),
    select: (res) => unwrapList<StaffMember>(res).filter((s) => s.userId),
    enabled: !!branchId && isManager,
  })

  const parentsQuery = useQuery({
    queryKey: ['appointments-parents', branchId],
    queryFn: () => api.get('/parents'),
    select: (res) => unwrapList<ParentRec>(res),
    enabled: !!branchId && isManager,
  })

  const createAppt = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<Appointment>(api.post('/appointments', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setCreateOpen(false)
      setForm(EMPTY)
      setSelectedStaff(new Set())
      setSelectedParents(new Set())
      setInfo('Appointment requested')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      unwrap<Appointment>(api.patch(`/appointments/${id}/status`, { status, reason })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setCancelReason('')
      setInfo('Appointment updated')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const deleteAppt = useMutation({
    mutationFn: (id: string) => unwrap<{ id: string }>(api.delete(`/appointments/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setDetail(null)
      setInfo('Appointment deleted')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const appointments = listQuery.data ?? []

  const calendar = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const first = new Date(year, month, 1)
    const start = new Date(first)
    start.setDate(1 - ((first.getDay() + 6) % 7))
    const cells: Date[] = []
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(start))
      start.setDate(start.getDate() + 1)
    }
    return cells
  }, [viewDate])

  const apptsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    const items = listQuery.data ?? []
    for (const a of items) {
      const key = new Date(a.scheduledAt).toDateString()
      const arr = map.get(key) ?? []
      arr.push(a)
      map.set(key, arr)
    }
    return map
  }, [listQuery.data])

  const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const todayStr = new Date().toDateString()

  const shiftMonth = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  }

  const openCreate = (day?: Date) => {
    setError(null)
    setInfo(null)
    const pad = (n: number) => String(n).padStart(2, '0')
    const base = day ?? new Date()
    setForm((f) => ({
      ...f,
      date: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
    }))
    setCreateOpen(true)
  }

  const submit = () => {
    setError(null)
    setInfo(null)
    if (!form.title.trim() || !form.date) {
      setError('Title and date are required')
      return
    }
    const scheduledAt = new Date(`${form.date}T${form.time || '09:00'}`)
    if (Number.isNaN(scheduledAt.getTime())) {
      setError('Invalid date/time')
      return
    }
    const participants: Array<{ userId?: string; parentId?: string; role: string }> = []
    for (const sid of selectedStaff) {
      const s = staffQuery.data?.find((x) => x.id === sid)
      if (s?.userId) participants.push({ userId: s.userId, role: 'staff' })
    }
    for (const pid of selectedParents) {
      participants.push({ parentId: pid, role: 'parent' })
    }
    createAppt.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: Number(form.durationMinutes) || 30,
      location: form.location.trim() || undefined,
      mode: form.mode,
      participants,
    })
  }

  const participantLabel = (p: Appointment['participants'][number]) => {
    if (p.role === 'principal') return `${p.name} (Principal)`
    if (p.role === 'parent') return `${p.name} (Parent)`
    return p.name
  }

  const toggleStaff = (id: string) => {
    setSelectedStaff((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleParent = (id: string) => {
    setSelectedParents((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Appointments</h2>
          <p className="text-sm text-slate-500">
            {isManager ? 'Full branch calendar' : 'Your appointments with the principal'} · {appointments.length} upcoming
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {isManager ? 'You can see and manage every appointment' : 'Requests are sent to the principal'}
          </span>
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> New Appointment
          </button>
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-semibold text-slate-900">{monthLabel}</h3>
            <button onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setViewDate(new Date())}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendar.map((day, i) => {
            const inMonth = day.getMonth() === viewDate.getMonth()
            const isToday = day.toDateString() === todayStr
            const dayApps = apptsByDay.get(day.toDateString()) ?? []
            return (
              <div
                key={i}
                onClick={() => openCreate(day)}
                className={`min-h-[96px] cursor-pointer border-b border-r border-slate-100 p-1.5 ${
                  inMonth ? 'bg-white' : 'bg-slate-50/60'
                } ${isToday ? 'ring-1 ring-inset ring-indigo-400' : ''}`}
              >
                <div className={`mb-1 text-right text-xs font-medium ${isToday ? 'text-indigo-600' : inMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayApps.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetail(a)
                      }}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ring-1 ${
                        a.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                          : a.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 ring-amber-200'
                            : a.status === 'declined' || a.status === 'cancelled'
                              ? 'bg-red-50 text-red-700 line-through ring-red-200'
                              : 'bg-indigo-50 text-indigo-800 ring-indigo-200'
                      }`}
                    >
                      {new Date(a.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {a.title}
                    </button>
                  ))}
                  {dayApps.length > 3 && (
                    <div className="px-1.5 text-[11px] text-slate-400">+{dayApps.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" /> Declined / Cancelled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" /> Completed
        </span>
      </div>

      <Modal open={createOpen} title="New Appointment" onClose={() => setCreateOpen(false)} wide>
        <div className="space-y-4">
          <Field label="Title" required>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Monthly staff meeting"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" required>
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                className={inputCls}
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (minutes)">
              <select
                className={inputCls}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              >
                {['15', '30', '45', '60', '90', '120'].map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mode">
              <select
                className={inputCls}
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              >
                <option value="in_person">In person</option>
                <option value="video">Video call</option>
                <option value="phone">Phone</option>
              </select>
            </Field>
          </div>
          <Field label="Location">
            <input
              className={inputCls}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Principal's office"
            />
          </Field>
          <Field label="Description">
            <textarea
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Agenda or notes"
            />
          </Field>

          {isManager ? (
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-xs font-medium text-slate-500">Staff participants</div>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {(staffQuery.data ?? []).length === 0 && (
                    <div className="text-xs text-slate-400">No staff accounts with logins found</div>
                  )}
                  {(staffQuery.data ?? []).map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600"
                        checked={selectedStaff.has(s.id)}
                        onChange={() => toggleStaff(s.id)}
                      />
                      {s.firstName} {s.lastName} <span className="text-xs text-slate-400">{s.designation}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-slate-500">Parent participants</div>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {(parentsQuery.data ?? []).length === 0 && (
                    <div className="text-xs text-slate-400">No parents on record</div>
                  )}
                  {(parentsQuery.data ?? []).map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600"
                        checked={selectedParents.has(p.id)}
                        onChange={() => toggleParent(p.id)}
                      />
                      {p.name} <span className="text-xs text-slate-400">{p.relationship}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">The principal is added automatically when not selected.</p>
            </div>
          ) : (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700 ring-1 ring-indigo-100">
              This request will be sent to the principal{role === 'parent' ? ' of your child\'s school' : ''}.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={createAppt.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {createAppt.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Request Appointment
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} title={detail?.title ?? ''} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge tone={STATUS_TONES[detail.status] ?? 'slate'}>{detail.status}</Badge>
              <span className="text-xs text-slate-400">Requested by {detail.requestedByName}</span>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {fmtDateTime(detail.scheduledAt)} · {detail.durationMinutes ?? 30} min
              </div>
              <div className="flex items-center gap-2">
                {detail.mode === 'video' ? (
                  <Video className="h-4 w-4 text-slate-400" />
                ) : detail.mode === 'phone' ? (
                  <Phone className="h-4 w-4 text-slate-400" />
                ) : (
                  <Clock className="h-4 w-4 text-slate-400" />
                )}
                <span className="capitalize">{(detail.mode ?? 'in_person').replace('_', ' ')}</span>
                {detail.location && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="h-3.5 w-3.5" /> {detail.location}
                  </span>
                )}
              </div>
              {detail.description && <p className="text-slate-600">{detail.description}</p>}
              {detail.cancelledReason && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
                  Reason: {detail.cancelledReason}
                </p>
              )}
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-slate-500">Participants</div>
              <div className="space-y-1.5">
                {detail.participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <User className="h-4 w-4 text-slate-400" />
                    {participantLabel(p)}
                  </div>
                ))}
              </div>
            </div>

            {detail.status === 'pending' && isManager && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus.mutate({ id: detail.id, status: 'confirmed' })}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setStatus.mutate({ id: detail.id, status: 'declined', reason: cancelReason || undefined })}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Decline
                </button>
              </div>
            )}
            {detail.status === 'confirmed' && isManager && (
              <button
                onClick={() => setStatus.mutate({ id: detail.id, status: 'completed' })}
                className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Mark Completed
              </button>
            )}
            {(detail.status === 'pending' || detail.status === 'confirmed') &&
              (isManager || detail.requestedBy === user?.id || detail.requestedBy === user?.sub) && (
                <div className="space-y-2">
                  <input
                    className={inputCls}
                    placeholder="Reason (optional)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <button
                    onClick={() => setStatus.mutate({ id: detail.id, status: 'cancelled', reason: cancelReason || undefined })}
                    className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Cancel Appointment
                  </button>
                </div>
              )}
            {isManager && (
              <button
                onClick={() => deleteAppt.mutate(detail.id)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
