import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, Building2 } from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
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

interface Hostel {
  id: string
  name: string
  code: string | null
  address: string | null
  wardenId: string | null
  totalRooms: number | null
  totalBeds: number | null
  status: string | null
}

interface Room {
  id: string
  hostelId: string
  roomNumber: string
  floor: number | null
  capacity: number | null
  bedCount: number | null
  roomType: string | null
  rentAmount: string | null
  status: string | null
}

interface Allocation {
  id: string
  roomId: string
  studentId: string
  bedNumber: string | null
  allocationDate: string | null
  status: string | null
}

interface Student {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string | null
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
}

const EMPTY_HOSTEL = {
  name: '',
  code: '',
  address: '',
  wardenId: '',
  totalRooms: '',
  totalBeds: '',
}

const EMPTY_ROOM = {
  hostelId: '',
  roomNumber: '',
  floor: '',
  capacity: '',
  bedCount: '',
  roomType: '',
  rentAmount: '',
}

const EMPTY_ALLOCATION = {
  hostelId: '',
  roomId: '',
  studentId: '',
  bedNumber: '',
  allocationDate: '',
}

export default function Hostel() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tab, setTab] = useState<'hostels' | 'rooms' | 'allocations'>('hostels')
  const [hostelOpen, setHostelOpen] = useState(false)
  const [roomOpen, setRoomOpen] = useState(false)
  const [allocOpen, setAllocOpen] = useState(false)
  const [hostelForm, setHostelForm] = useState({ ...EMPTY_HOSTEL })
  const [roomForm, setRoomForm] = useState({ ...EMPTY_ROOM })
  const [allocForm, setAllocForm] = useState({ ...EMPTY_ALLOCATION })
  const [saving, setSaving] = useState(false)

  const hostelsQuery = useQuery({
    queryKey: ['hostels', branchId],
    queryFn: () => api.get('/hostel', { params: { page: 1, limit: 100 } }),
  })
  const hostels = (hostelsQuery.data?.data?.data ?? []) as Hostel[]

  const roomsQuery = useQuery({
    queryKey: ['hostel-rooms', branchId, allocForm.hostelId || roomForm.hostelId],
    queryFn: () => {
      const hid = allocForm.hostelId || roomForm.hostelId
      if (!hid) return Promise.resolve({ data: { data: [] } })
      return api.get(`/hostel/${hid}/rooms`, { params: { page: 1, limit: 100 } })
    },
  })
  const rooms = (roomsQuery.data?.data?.data ?? []) as Room[]

  const allocationsQuery = useQuery({
    queryKey: ['hostel-allocations', branchId],
    queryFn: () => api.get('/hostel/allocations', { params: { page: 1, limit: 100 } }),
  })
  const allocations = (allocationsQuery.data?.data?.data ?? []) as Allocation[]

  const studentsQuery = useQuery({
    queryKey: ['students', branchId],
    queryFn: () => api.get('/students', { params: { page: 1, limit: 200 } }),
  })
  const students = (studentsQuery.data?.data?.data ?? []) as Student[]

  const staffQuery = useQuery({
    queryKey: ['staff', branchId],
    queryFn: () => api.get('/staff', { params: { page: 1, limit: 200 } }),
  })
  const staff = (staffQuery.data?.data?.data ?? []) as StaffMember[]

  const wardenName = (id: string | null) => {
    const s = staff.find((x) => x.id === id)
    return s ? `${s.firstName} ${s.lastName}` : id ? id.slice(0, 8) : '—'
  }

  const hostelName = (id: string) => hostels.find((h) => h.id === id)?.name ?? id.slice(0, 8)

  const roomLabel = (id: string) => {
    const r = rooms.find((x) => x.id === id)
    return r ? `${hostelName(r.hostelId)} · ${r.roomNumber}` : id.slice(0, 8)
  }

  const studentName = (id: string) => {
    const s = students.find((st) => st.id === id)
    return s ? `${s.firstName} ${s.lastName}` : id.slice(0, 8)
  }

  const createHostel = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/hostel', {
          name: hostelForm.name,
          code: hostelForm.code || undefined,
          address: hostelForm.address || undefined,
          wardenId: hostelForm.wardenId || undefined,
          totalRooms: hostelForm.totalRooms ? Number(hostelForm.totalRooms) : undefined,
          totalBeds: hostelForm.totalBeds ? Number(hostelForm.totalBeds) : undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostels'] })
      setHostelOpen(false)
      setHostelForm({ ...EMPTY_HOSTEL })
      setInfo('Hostel created')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const deleteHostel = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/hostel/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostels'] })
      setInfo('Hostel removed')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const createRoom = useMutation({
    mutationFn: () =>
      unwrap(
        api.post(`/hostel/${roomForm.hostelId}/rooms`, {
          roomNumber: roomForm.roomNumber,
          floor: roomForm.floor ? Number(roomForm.floor) : undefined,
          capacity: roomForm.capacity ? Number(roomForm.capacity) : undefined,
          bedCount: roomForm.bedCount ? Number(roomForm.bedCount) : undefined,
          roomType: roomForm.roomType || undefined,
          rentAmount: roomForm.rentAmount || undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-rooms'] })
      setRoomOpen(false)
      setRoomForm({ ...EMPTY_ROOM })
      setInfo('Room added')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const deleteRoom = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/hostel/rooms/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-rooms'] })
      setInfo('Room removed')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const createAllocation = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/hostel/allocations', {
          roomId: allocForm.roomId,
          studentId: allocForm.studentId,
          bedNumber: allocForm.bedNumber || undefined,
          allocationDate: allocForm.allocationDate,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-allocations'] })
      setAllocOpen(false)
      setAllocForm({ ...EMPTY_ALLOCATION })
      setInfo('Bed allocated')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const deleteAllocation = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/hostel/allocations/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-allocations'] })
      setInfo('Allocation removed')
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
          <h1 className="text-lg font-semibold text-slate-900">Hostel</h1>
          <p className="text-sm text-slate-500">Hostels, rooms and bed allocations</p>
        </div>
        <div className="flex gap-2">
          {tab === 'hostels' && (
            <button
              onClick={() => setHostelOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Add Hostel
            </button>
          )}
          {tab === 'rooms' && (
            <button
              onClick={() => setRoomOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Add Room
            </button>
          )}
          {tab === 'allocations' && (
            <button
              onClick={() => setAllocOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Allocate Bed
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
        {(['hostels', 'rooms', 'allocations'] as const).map((t) => (
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

      {tab === 'hostels' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hostels.map((h) => (
            <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-500" />
                  <span className="font-semibold text-slate-800">{h.name}</span>
                </div>
                <button onClick={() => deleteHostel.mutate(h.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
              {h.code && <div className="mt-1 text-xs text-slate-400">{h.code}</div>}
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <div>Warden: <span className="font-medium text-slate-800">{wardenName(h.wardenId)}</span></div>
                <div>Rooms: {h.totalRooms ?? '—'} · Beds: {h.totalBeds ?? '—'}</div>
                {h.address && <div className="text-xs text-slate-400">{h.address}</div>}
              </div>
              <div className="mt-3">
                <Badge tone={h.status === 'active' ? 'green' : 'slate'}>{h.status ?? '—'}</Badge>
              </div>
            </div>
          ))}
          {hostels.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
              No hostels yet
            </div>
          )}
        </div>
      )}

      {tab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={roomForm.hostelId}
              onChange={(e) => setRoomForm({ ...roomForm, hostelId: e.target.value })}
              className={`${inputCls} !w-64`}
            >
              <option value="">Select hostel</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          {roomForm.hostelId && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Room</th>
                    <th className="px-4 py-3 font-medium">Floor</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Capacity</th>
                    <th className="px-4 py-3 font-medium">Beds</th>
                    <th className="px-4 py-3 font-medium">Rent</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.roomNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{r.floor ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.roomType ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.capacity ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.bedCount ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.rentAmount ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteRoom.mutate(r.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'allocations' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Bed</th>
                <th className="px-4 py-3 font-medium">Allocated On</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{studentName(a.studentId)}</td>
                  <td className="px-4 py-3 text-slate-600">{roomLabel(a.roomId)}</td>
                  <td className="px-4 py-3 text-slate-600">{a.bedNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{a.allocationDate ? String(a.allocationDate).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3"><Badge tone={a.status === 'active' ? 'green' : 'slate'}>{a.status ?? '—'}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteAllocation.mutate(a.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={hostelOpen} title="Add Hostel" onClose={() => setHostelOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createHostel.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Name" required>
            <input
              required
              value={hostelForm.name}
              onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code">
              <input
                value={hostelForm.code}
                onChange={(e) => setHostelForm({ ...hostelForm, code: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Warden">
              <select
                value={hostelForm.wardenId}
                onChange={(e) => setHostelForm({ ...hostelForm, wardenId: e.target.value })}
                className={inputCls}
              >
                <option value="">No warden</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Rooms">
              <input
                type="number"
                min={0}
                value={hostelForm.totalRooms}
                onChange={(e) => setHostelForm({ ...hostelForm, totalRooms: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Total Beds">
              <input
                type="number"
                min={0}
                value={hostelForm.totalBeds}
                onChange={(e) => setHostelForm({ ...hostelForm, totalBeds: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Address">
            <textarea
              rows={2}
              value={hostelForm.address}
              onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setHostelOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Add Hostel
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={roomOpen} title="Add Room" onClose={() => setRoomOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createRoom.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Hostel" required>
            <select
              required
              value={roomForm.hostelId}
              onChange={(e) => setRoomForm({ ...roomForm, hostelId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select hostel</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Room Number" required>
            <input
              required
              value={roomForm.roomNumber}
              onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Floor">
              <input
                type="number"
                value={roomForm.floor}
                onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Capacity">
              <input
                type="number"
                min={1}
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Beds">
              <input
                type="number"
                min={1}
                value={roomForm.bedCount}
                onChange={(e) => setRoomForm({ ...roomForm, bedCount: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room Type">
              <select
                value={roomForm.roomType}
                onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}
                className={inputCls}
              >
                <option value="">Select</option>
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
                <option value="dorm">Dormitory</option>
              </select>
            </Field>
            <Field label="Rent / Month">
              <input
                type="number"
                step="0.01"
                value={roomForm.rentAmount}
                onChange={(e) => setRoomForm({ ...roomForm, rentAmount: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRoomOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Add Room
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={allocOpen} title="Allocate Bed" onClose={() => setAllocOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createAllocation.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Hostel" required>
            <select
              required
              value={allocForm.hostelId}
              onChange={(e) => setAllocForm({ ...allocForm, hostelId: e.target.value, roomId: '' })}
              className={inputCls}
            >
              <option value="">Select hostel</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Room" required>
            <select
              required
              value={allocForm.roomId}
              onChange={(e) => setAllocForm({ ...allocForm, roomId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.bedCount ?? r.capacity ?? '?'} beds)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Student" required>
            <select
              required
              value={allocForm.studentId}
              onChange={(e) => setAllocForm({ ...allocForm, studentId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bed Number">
              <input
                value={allocForm.bedNumber}
                onChange={(e) => setAllocForm({ ...allocForm, bedNumber: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Allocation Date" required>
              <input
                type="date"
                required
                value={allocForm.allocationDate}
                onChange={(e) => setAllocForm({ ...allocForm, allocationDate: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAllocOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Allocate
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
