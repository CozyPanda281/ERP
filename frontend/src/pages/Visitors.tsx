import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, LogOut } from 'lucide-react'
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

interface Visitor {
  id: string
  name: string
  phone: string | null
  email: string | null
  idProofType: string | null
  idProofNumber: string | null
  purpose: string | null
  personToMeet: string | null
  department: string | null
  checkInTime: string | null
  checkOutTime: string | null
  vehicleNumber: string | null
  badgeNumber: string | null
  temperature: string | null
  isPreApproved: boolean | null
  status: string | null
}

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  purpose: '',
  personToMeet: '',
  department: '',
  idProofType: '',
  idProofNumber: '',
  vehicleNumber: '',
  badgeNumber: '',
  temperature: '',
  isPreApproved: false,
}

export default function Visitors() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  const listQuery = useQuery({
    queryKey: ['visitors', branchId, statusFilter],
    queryFn: () =>
      api.get('/visitors', {
        params: { page: 1, limit: 100, ...(statusFilter ? { status: statusFilter } : {}) },
      }),
  })
  const visitors = (listQuery.data?.data?.data ?? []) as Visitor[]

  const checkIn = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/visitors/check-in', {
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          purpose: form.purpose,
          personToMeet: form.personToMeet || undefined,
          department: form.department || undefined,
          idProofType: form.idProofType || undefined,
          idProofNumber: form.idProofNumber || undefined,
          vehicleNumber: form.vehicleNumber || undefined,
          badgeNumber: form.badgeNumber || undefined,
          temperature: form.temperature || undefined,
          isPreApproved: form.isPreApproved,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
      setForm({ ...EMPTY })
      setInfo('Visitor checked in')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const checkOut = useMutation({
    mutationFn: (id: string) => unwrap(api.put(`/visitors/${id}/check-out`, {})),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
      setInfo('Visitor checked out')
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

      <div>
        <h1 className="text-lg font-semibold text-slate-900">Visitor Management</h1>
        <p className="text-sm text-slate-500">Check visitors in and out at the gate</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            checkIn.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-1 h-fit"
        >
          <h3 className="text-sm font-semibold text-slate-900">Check-In Visitor</h3>
          <Field label="Name" required>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Purpose" required>
            <input
              required
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="e.g. Parent-teacher meeting"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Person To Meet">
              <input
                value={form.personToMeet}
                onChange={(e) => setForm({ ...form, personToMeet: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Department">
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID Proof Type">
              <input
                value={form.idProofType}
                onChange={(e) => setForm({ ...form, idProofType: e.target.value })}
                placeholder="e.g. Driving license"
                className={inputCls}
              />
            </Field>
            <Field label="ID Proof Number">
              <input
                value={form.idProofNumber}
                onChange={(e) => setForm({ ...form, idProofNumber: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle Number">
              <input
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Temperature">
              <input
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isPreApproved}
              onChange={(e) => setForm({ ...form, isPreApproved: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Pre-approved visitor
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="mr-2 inline animate-spin" />}Check In
          </button>
        </form>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputCls} !w-44`}
            >
              <option value="">All visitors</option>
              <option value="checked_in">Checked in</option>
              <option value="checked_out">Checked out</option>
            </select>
          </div>
          {listQuery.isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : visitors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
              No visitors yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Visitor</th>
                    <th className="px-4 py-3 font-medium">Purpose</th>
                    <th className="px-4 py-3 font-medium">Check In</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visitors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{v.name}</div>
                        <div className="text-xs text-slate-400">
                          {v.phone ?? ''}{v.personToMeet ? ` · meeting ${v.personToMeet}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.purpose ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {v.checkInTime ? new Date(v.checkInTime).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={v.status === 'checked_in' ? 'green' : 'slate'}>{v.status ?? '—'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {v.status === 'checked_in' && (
                          <button
                            onClick={() => checkOut.mutate(v.id)}
                            disabled={checkOut.isPending}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            <LogOut size={13} /> Check Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
