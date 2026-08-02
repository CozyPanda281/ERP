import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, Building2, MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

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
      <div className={`my-8 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-xl bg-white p-6 shadow-xl`}>
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

interface Branch {
  id: string
  tenantId: string
  name: string
  code: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  principalId: string | null
  isActive: boolean
  createdAt?: string | null
}

const EMPTY_FORM = {
  name: '',
  code: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
}

export default function Branches() {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''
  const currentBranchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<Branch | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const listQuery = useQuery({
    queryKey: ['branches', tenantId],
    queryFn: () => unwrap<Branch[]>(api.get('/branches', { params: { page: 1, limit: 100 } })),
    select: (data) => (Array.isArray(data) ? data : []),
    enabled: !!tenantId,
  })

  const createBranch = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<Branch>(api.post('/branches', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      setInfo('Branch created')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const updateBranch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      unwrap<Branch>(api.put(`/branches/${id}`, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setEdit(null)
      setInfo('Branch updated')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const deleteBranch = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/branches/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setInfo('Branch removed')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submitCreate = () => {
    setError(null)
    setInfo(null)
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and code are required')
      return
    }
    const body: Record<string, unknown> = { ...form }
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' && !v.trim()) body[k] = undefined
    }
    createBranch.mutate(body)
  }

  const submitEdit = () => {
    if (!edit) return
    setError(null)
    setInfo(null)
    const body: Record<string, unknown> = {
      name: form.name.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      pincode: form.pincode.trim() || undefined,
    }
    updateBranch.mutate({ id: edit.id, body })
  }

  const openEdit = (b: Branch) => {
    setForm({
      name: b.name,
      code: b.code,
      email: b.email ?? '',
      phone: b.phone ?? '',
      address: b.address ?? '',
      city: b.city ?? '',
      state: b.state ?? '',
      pincode: b.pincode ?? '',
    })
    setEdit(b)
  }

  const branches = listQuery.data ?? []
  const current = branches.find((b) => b.id === currentBranchId)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Branches</h2>
          <p className="text-sm text-slate-500">{branches.length} branch(es) in this organization</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Branch
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

      {current && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
          <CheckCircle2 className="h-4 w-4 text-indigo-600" />
          You are signed in to <strong>{current.name}</strong> ({current.code}) — branch {branches.indexOf(current) + 1} of {branches.length}.
        </div>
      )}

      {listQuery.isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No branches yet. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => (
            <div key={b.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-slate-900">
                    {b.name}
                    {b.id === currentBranchId && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        current
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-slate-500">{b.code}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
                {(b.phone || b.email) && (
                  <div className="flex items-center gap-2">
                    {b.phone ? <Phone className="h-3.5 w-3.5 text-slate-400" /> : <Mail className="h-3.5 w-3.5 text-slate-400" />}
                    <span>{b.phone ?? b.email}</span>
                  </div>
                )}
                {b.email && b.phone && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{b.email}</span>
                  </div>
                )}
                {(b.address || b.city || b.state) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{[b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => openEdit(b)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Remove branch "${b.name}"?`)) deleteBranch.mutate(b.id)
                  }}
                  disabled={b.id === currentBranchId || deleteBranch.isPending}
                  title={b.id === currentBranchId ? 'Cannot remove the branch you are signed in to' : 'Remove branch'}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} title="Add Branch" onClose={() => setCreateOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Branch name" required>
            <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Code" required>
            <input className={inputCls} placeholder="e.g. MAIN" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
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
          onClick={submitCreate}
          disabled={createBranch.isPending}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createBranch.isPending ? 'Creating…' : 'Create Branch'}
        </button>
      </Modal>

      <Modal open={!!edit} title="Edit Branch" onClose={() => setEdit(null)} wide>
        {edit && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Branch name">
                <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </Field>
              <div className="flex items-end pb-2">
                <span className="w-full rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-500">{form.code}</span>
              </div>
              <Field label="Email">
                <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
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
              onClick={submitEdit}
              disabled={updateBranch.isPending}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {updateBranch.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        )}
      </Modal>
    </div>
  )
}
