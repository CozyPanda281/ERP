import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, Bus } from 'lucide-react'
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

interface Vehicle {
  id: string
  vehicleNumber: string
  model: string | null
  capacity: number | null
  driverName: string | null
  driverPhone: string | null
  insuranceExpiry: string | null
  status: string | null
}

interface Route {
  id: string
  name: string
  vehicleId: string | null
  description: string | null
  distance: string | null
  fare: string | null
  status: string | null
}

interface Assignment {
  id: string
  studentId: string
  routeId: string
  stopId: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  status: string | null
}

interface Student {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string | null
}

const EMPTY_VEHICLE = {
  vehicleNumber: '',
  model: '',
  capacity: '',
  driverName: '',
  driverPhone: '',
  insuranceExpiry: '',
}

const EMPTY_ROUTE = {
  name: '',
  vehicleId: '',
  description: '',
  distance: '',
  fare: '',
}

const EMPTY_ASSIGNMENT = {
  studentId: '',
  routeId: '',
  effectiveFrom: '',
  effectiveTo: '',
}

export default function Transport() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tab, setTab] = useState<'vehicles' | 'routes' | 'assignments'>('vehicles')
  const [vehOpen, setVehOpen] = useState(false)
  const [routeOpen, setRouteOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [vehForm, setVehForm] = useState({ ...EMPTY_VEHICLE })
  const [routeForm, setRouteForm] = useState({ ...EMPTY_ROUTE })
  const [assignForm, setAssignForm] = useState({ ...EMPTY_ASSIGNMENT })
  const [saving, setSaving] = useState(false)

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', branchId],
    queryFn: () => api.get('/transport/vehicles', { params: { page: 1, limit: 100 } }),
  })
  const vehicles = (vehiclesQuery.data?.data?.data ?? []) as Vehicle[]

  const routesQuery = useQuery({
    queryKey: ['routes', branchId],
    queryFn: () => api.get('/transport/routes', { params: { page: 1, limit: 100 } }),
  })
  const routes = (routesQuery.data?.data?.data ?? []) as Route[]

  const assignmentsQuery = useQuery({
    queryKey: ['transport-assignments', branchId],
    queryFn: () => api.get('/transport/assignments', { params: { page: 1, limit: 100 } }),
  })
  const assignments = (assignmentsQuery.data?.data?.data ?? []) as Assignment[]

  const studentsQuery = useQuery({
    queryKey: ['students', branchId],
    queryFn: () => api.get('/students', { params: { page: 1, limit: 200 } }),
  })
  const students = (studentsQuery.data?.data?.data ?? []) as Student[]

  const vehicleName = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.vehicleNumber ?? id.slice(0, 8)) : '—'

  const routeName = (id: string) => routes.find((r) => r.id === id)?.name ?? id.slice(0, 8)

  const studentName = (id: string) => {
    const s = students.find((st) => st.id === id)
    return s ? `${s.firstName} ${s.lastName}` : id.slice(0, 8)
  }

  const createVehicle = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/transport/vehicles', {
          ...vehForm,
          capacity: vehForm.capacity ? Number(vehForm.capacity) : undefined,
          insuranceExpiry: vehForm.insuranceExpiry || undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setVehOpen(false)
      setVehForm({ ...EMPTY_VEHICLE })
      setInfo('Vehicle added')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const deleteVehicle = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/transport/vehicles/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setInfo('Vehicle removed')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const createRoute = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/transport/routes', {
          name: routeForm.name,
          vehicleId: routeForm.vehicleId || undefined,
          description: routeForm.description || undefined,
          distance: routeForm.distance || undefined,
          fare: routeForm.fare || undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      setRouteOpen(false)
      setRouteForm({ ...EMPTY_ROUTE })
      setInfo('Route added')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const deleteRoute = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/transport/routes/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      setInfo('Route removed')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const createAssignment = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/transport/assignments', {
          studentId: assignForm.studentId,
          routeId: assignForm.routeId,
          effectiveFrom: assignForm.effectiveFrom,
          effectiveTo: assignForm.effectiveTo || undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-assignments'] })
      setAssignOpen(false)
      setAssignForm({ ...EMPTY_ASSIGNMENT })
      setInfo('Student assigned to route')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const deleteAssignment = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/transport/assignments/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-assignments'] })
      setInfo('Assignment removed')
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
          <h1 className="text-lg font-semibold text-slate-900">Transport</h1>
          <p className="text-sm text-slate-500">Vehicles, routes and student assignments</p>
        </div>
        <div className="flex gap-2">
          {tab === 'vehicles' && (
            <button
              onClick={() => setVehOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Add Vehicle
            </button>
          )}
          {tab === 'routes' && (
            <button
              onClick={() => setRouteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Add Route
            </button>
          )}
          {tab === 'assignments' && (
            <button
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Assign Student
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
        {(['vehicles', 'routes', 'assignments'] as const).map((t) => (
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

      {tab === 'vehicles' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Insurance Expiry</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bus size={14} className="text-indigo-500" />
                      <span className="font-medium text-slate-800">{v.vehicleNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.model ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.capacity ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.driverName ?? '—'}{v.driverPhone ? ` (${v.driverPhone})` : ''}</td>
                  <td className="px-4 py-3 text-slate-600">{v.insuranceExpiry ? String(v.insuranceExpiry).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3"><Badge tone={v.status === 'active' ? 'green' : 'slate'}>{v.status ?? '—'}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteVehicle.mutate(v.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'routes' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Distance</th>
                <th className="px-4 py-3 font-medium">Fare</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.name}</div>
                    {r.description && <div className="text-xs text-slate-400">{r.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{vehicleName(r.vehicleId)}</td>
                  <td className="px-4 py-3 text-slate-600">{r.distance ? `${r.distance} km` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.fare ? `${r.fare}` : '—'}</td>
                  <td className="px-4 py-3"><Badge tone={r.status === 'active' ? 'green' : 'slate'}>{r.status ?? '—'}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteRoute.mutate(r.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Effective From</th>
                <th className="px-4 py-3 font-medium">Effective To</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{studentName(a.studentId)}</td>
                  <td className="px-4 py-3 text-slate-600">{routeName(a.routeId)}</td>
                  <td className="px-4 py-3 text-slate-600">{a.effectiveFrom ? String(a.effectiveFrom).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{a.effectiveTo ? String(a.effectiveTo).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3"><Badge tone={a.status === 'active' ? 'green' : 'slate'}>{a.status ?? '—'}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteAssignment.mutate(a.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={vehOpen} title="Add Vehicle" onClose={() => setVehOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createVehicle.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Vehicle Number" required>
            <input
              required
              value={vehForm.vehicleNumber}
              onChange={(e) => setVehForm({ ...vehForm, vehicleNumber: e.target.value })}
              placeholder="e.g. KL 07 AB 1234"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Model">
              <input
                value={vehForm.model}
                onChange={(e) => setVehForm({ ...vehForm, model: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Capacity">
              <input
                type="number"
                min={1}
                value={vehForm.capacity}
                onChange={(e) => setVehForm({ ...vehForm, capacity: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Driver Name">
              <input
                value={vehForm.driverName}
                onChange={(e) => setVehForm({ ...vehForm, driverName: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Driver Phone">
              <input
                value={vehForm.driverPhone}
                onChange={(e) => setVehForm({ ...vehForm, driverPhone: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Insurance Expiry">
            <input
              type="date"
              value={vehForm.insuranceExpiry}
              onChange={(e) => setVehForm({ ...vehForm, insuranceExpiry: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setVehOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Add Vehicle
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={routeOpen} title="Add Route" onClose={() => setRouteOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createRoute.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Route Name" required>
            <input
              required
              value={routeForm.name}
              onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
              placeholder="e.g. North Campus Route"
              className={inputCls}
            />
          </Field>
          <Field label="Vehicle">
            <select
              value={routeForm.vehicleId}
              onChange={(e) => setRouteForm({ ...routeForm, vehicleId: e.target.value })}
              className={inputCls}
            >
              <option value="">No vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Distance (km)">
              <input
                type="number"
                step="0.01"
                value={routeForm.distance}
                onChange={(e) => setRouteForm({ ...routeForm, distance: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Fare">
              <input
                type="number"
                step="0.01"
                value={routeForm.fare}
                onChange={(e) => setRouteForm({ ...routeForm, fare: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              rows={2}
              value={routeForm.description}
              onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRouteOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Add Route
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={assignOpen} title="Assign Student to Route" onClose={() => setAssignOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createAssignment.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Student" required>
            <select
              required
              value={assignForm.studentId}
              onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
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
          <Field label="Route" required>
            <select
              required
              value={assignForm.routeId}
              onChange={(e) => setAssignForm({ ...assignForm, routeId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select route</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Effective From" required>
              <input
                type="date"
                required
                value={assignForm.effectiveFrom}
                onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Effective To">
              <input
                type="date"
                value={assignForm.effectiveTo}
                onChange={(e) => setAssignForm({ ...assignForm, effectiveTo: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Assign
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
