import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  ReceiptText,
  Wallet,
  Layers,
  IndianRupee,
  X,
  FilePlus2,
} from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { ClassRecord, AcademicYear, Student } from '../lib/types'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

const money = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '₹0'
  return `₹${Number(v).toLocaleString('en-IN')}`
}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

interface FeeStructureRow {
  id: string
  name: string
  classId: string | null
  academicYearId: string | null
  frequency: string | null
  isActive: boolean
  createdAt?: string | null
}
interface FeeInvoice {
  id: string
  invoiceNumber: string
  studentId: string
  invoiceDate: string | null
  dueDate: string | null
  items: unknown[]
  subtotal: string
  discountTotal: string
  totalAmount: string
  amountPaid: string
  balanceDue: string
  status: string
  createdAt?: string | null
}
interface FeePayment {
  id: string
  transactionNo: string
  invoiceNo: string | null
  studentId: string
  amount: string
  paymentMethod: string | null
  paymentDate: string | null
  referenceNumber: string | null
  status: string
  remarks: string | null
  createdAt?: string | null
}

const FREQUENCIES = ['monthly', 'quarterly', 'half_yearly', 'annual']
const METHODS = ['cash', 'cheque', 'card', 'upi', 'online', 'bank_transfer', 'dd']

export default function Fees() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tab, setTab] = useState<'structures' | 'invoices' | 'payments'>('structures')

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
  const studentsQuery = useQuery({
    queryKey: ['students-map', branchId],
    queryFn: () =>
      unwrap<Student[]>(api.get(`/branches/${branchId}/students`, { params: { page: 1, limit: 100 } })),
    enabled: !!branchId,
  })
  const studentName = (id: string) => {
    const s = studentsQuery.data?.find((x) => x.id === id)
    return s ? `${s.firstName} ${s.lastName}` : id.slice(0, 8)
  }

  const structuresQuery = useQuery({
    queryKey: ['fee-structures', branchId],
    queryFn: () => unwrap<FeeStructureRow[]>(api.get('/fee-structures')),
    enabled: !!branchId,
  })
  const [invStatus, setInvStatus] = useState('')
  const invoicesQuery = useQuery({
    queryKey: ['fee-invoices', invStatus],
    queryFn: () =>
      unwrap<FeeInvoice[]>(api.get('/fee-invoices', { params: { page: 1, limit: 50, status: invStatus || undefined } })),
    enabled: !!branchId,
  })
  const [payMethod, setPayMethod] = useState('')
  const paymentsQuery = useQuery({
    queryKey: ['fee-payments', payMethod],
    queryFn: () =>
      unwrap<FeePayment[]>(
        api.get('/fee-payments', { params: { page: 1, limit: 50, paymentMethod: payMethod || undefined } }),
      ),
    enabled: !!branchId,
  })

  const invalidateFees = () => {
    queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
    queryClient.invalidateQueries({ queryKey: ['fee-invoices'] })
    queryClient.invalidateQueries({ queryKey: ['fee-payments'] })
  }

  // ---- Structures ----
  const [structOpen, setStructOpen] = useState(false)
  const [structForm, setStructForm] = useState({
    name: '',
    classId: '',
    academicYearId: '',
    frequency: 'annual',
    description: '',
  })
  const [structItems, setStructItems] = useState<{ name: string; amount: string; frequency: string }[]>([
    { name: '', amount: '', frequency: 'annual' },
  ])

  const createStructure = useMutation({
    mutationFn: (body: unknown) => unwrap<FeeStructureRow>(api.post('/fee-structures', body)),
    onSuccess: () => {
      invalidateFees()
      setStructOpen(false)
      setStructForm({ name: '', classId: '', academicYearId: '', frequency: 'annual', description: '' })
      setStructItems([{ name: '', amount: '', frequency: 'annual' }])
      setInfo('Fee structure created')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const deleteStructure = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/fee-structures/${id}`)),
    onSuccess: () => {
      invalidateFees()
      setInfo('Fee structure deleted')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  // ---- Invoices ----
  const [invOpen, setInvOpen] = useState(false)
  const [invForm, setInvForm] = useState({ studentId: '', dueDate: '' })
  const [invItems, setInvItems] = useState<{ name: string; amount: string }[]>([{ name: '', amount: '' }])

  const generateInvoice = useMutation({
    mutationFn: (body: unknown) => unwrap<FeeInvoice>(api.post('/fee-invoices/generate', body)),
    onSuccess: () => {
      invalidateFees()
      setInvOpen(false)
      setInvForm({ studentId: '', dueDate: '' })
      setInvItems([{ name: '', amount: '' }])
      setInfo('Invoice generated')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  // ---- Payments ----
  const [payOpen, setPayOpen] = useState(false)
  const [payForm, setPayForm] = useState({
    studentId: '',
    amount: '',
    paymentMethod: 'cash',
    paymentDate: '',
    referenceNumber: '',
    remarks: '',
  })

  const recordPayment = useMutation({
    mutationFn: (body: unknown) => unwrap<FeePayment>(api.post('/fee-payments', body)),
    onSuccess: () => {
      invalidateFees()
      setPayOpen(false)
      setPayForm({ studentId: '', amount: '', paymentMethod: 'cash', paymentDate: '', referenceNumber: '', remarks: '' })
      setInfo('Payment recorded')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const paidTotal = (paymentsQuery.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  const dueTotal = (invoicesQuery.data ?? []).reduce((sum, i) => sum + Number(i.balanceDue), 0)

  const setItem = <T extends { name: string; amount: string }>(
    arr: T[],
    setter: (v: T[]) => void,
    i: number,
    k: 'name' | 'amount',
    v: string,
  ) => {
    setter(arr.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Fees &amp; Billing</h2>
          <p className="text-sm text-slate-500">Structures, invoices and payments</p>
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

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Fee structures', value: structuresQuery.data?.length ?? 0, icon: <Layers className="h-5 w-5" /> },
          { label: 'Outstanding on page', value: money(dueTotal), icon: <ReceiptText className="h-5 w-5" /> },
          { label: 'Collected on page', value: money(paidTotal), icon: <Wallet className="h-5 w-5" /> },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{c.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="text-lg font-semibold text-slate-900">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {(
          [
            ['structures', 'Fee Structures'],
            ['invoices', 'Invoices'],
            ['payments', 'Payments'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto">
          {tab === 'structures' && (
            <button onClick={() => setStructOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> New Structure
            </button>
          )}
          {tab === 'invoices' && (
            <button onClick={() => setInvOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <FilePlus2 className="h-4 w-4" /> Generate Invoice
            </button>
          )}
          {tab === 'payments' && (
            <button onClick={() => setPayOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Record Payment
            </button>
          )}
        </div>
      </div>

      {tab === 'structures' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Academic year</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(structuresQuery.data ?? []).map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {classesQuery.data?.find((c) => c.id === s.classId)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {yearsQuery.data?.find((y) => y.id === s.academicYearId)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{s.frequency ?? '—'}</td>
                  <td className="px-4 py-3">
                    {s.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete structure "${s.name}"?`)) deleteStructure.mutate(s.id)
                      }}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Delete structure"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {(structuresQuery.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No fee structures yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <select className={`${inputCls} w-auto`} value={invStatus} onChange={(e) => setInvStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(invoicesQuery.data ?? []).map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{i.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{studentName(i.studentId)}</td>
                    <td className="px-4 py-3 text-slate-600">{i.invoiceDate ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{i.dueDate ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{money(i.totalAmount)}</td>
                    <td className="px-4 py-3 text-emerald-700">{money(i.amountPaid)}</td>
                    <td className="px-4 py-3 text-red-600">{money(i.balanceDue)}</td>
                    <td className="px-4 py-3">
                      {i.status === 'paid' ? (
                        <Badge tone="green">Paid</Badge>
                      ) : i.status === 'partial' ? (
                        <Badge tone="amber">Partial</Badge>
                      ) : i.status === 'overdue' ? (
                        <Badge tone="red">Overdue</Badge>
                      ) : (
                        <Badge>{i.status}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {(invoicesQuery.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No invoices.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">
          <select className={`${inputCls} w-auto`} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
            <option value="">All methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Txn</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(paymentsQuery.data ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.transactionNo}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{studentName(p.studentId)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.paymentDate ?? '—'}</td>
                    <td className="px-4 py-3 uppercase text-slate-600">{p.paymentMethod ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{money(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.referenceNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.status === 'completed' ? (
                        <Badge tone="green">Completed</Badge>
                      ) : (
                        <Badge tone={p.status === 'failed' ? 'red' : 'amber'}>{p.status}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {(paymentsQuery.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No payments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={structOpen} title="New Fee Structure" onClose={() => setStructOpen(false)} wide>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name *">
              <input className={inputCls} value={structForm.name} onChange={(e) => setStructForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Class *">
              <select className={inputCls} value={structForm.classId} onChange={(e) => setStructForm((f) => ({ ...f, classId: e.target.value }))}>
                <option value="">Select…</option>
                {(classesQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Academic year">
              <select className={inputCls} value={structForm.academicYearId} onChange={(e) => setStructForm((f) => ({ ...f, academicYearId: e.target.value }))}>
                <option value="">Select…</option>
                {(yearsQuery.data ?? []).map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Frequency">
              <select className={inputCls} value={structForm.frequency} onChange={(e) => setStructForm((f) => ({ ...f, frequency: e.target.value }))}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <input className={inputCls} value={structForm.description} onChange={(e) => setStructForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Fee items</p>
            <div className="space-y-2">
              {structItems.map((it, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input className={`${inputCls} flex-1`} placeholder="Item name (e.g. Tuition fee)" value={it.name} onChange={(e) => setItem(structItems, setStructItems, i, 'name', e.target.value)} />
                  <input className={`${inputCls} w-32`} type="number" placeholder="Amount" value={it.amount} onChange={(e) => setItem(structItems, setStructItems, i, 'amount', e.target.value)} />
                  <select
                    className={`${inputCls} w-36`}
                    value={it.frequency}
                    onChange={(e) => setStructItems(structItems.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setStructItems(structItems.filter((_, j) => j !== i))}
                    disabled={structItems.length === 1}
                    className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                    aria-label="Remove item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStructItems([...structItems, { name: '', amount: '', frequency: structForm.frequency }])}
              className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              + Add item
            </button>
          </div>

          <button
            onClick={() => {
              setError(null)
              if (!structForm.name.trim() || !structForm.classId) {
                setError('Structure name and class are required')
                return
              }
              const items = structItems
                .filter((i) => i.name.trim() && i.amount)
                .map((i) => ({ name: i.name.trim(), amount: Number(i.amount), frequency: i.frequency }))
              if (items.length === 0) {
                setError('Add at least one fee item with an amount')
                return
              }
              createStructure.mutate({
                name: structForm.name.trim(),
                classId: structForm.classId,
                academicYearId: structForm.academicYearId || undefined,
                frequency: structForm.frequency,
                description: structForm.description.trim() || undefined,
                items,
              })
            }}
            disabled={createStructure.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createStructure.isPending ? 'Creating…' : 'Create Structure'}
          </button>
        </div>
      </Modal>

      <Modal open={invOpen} title="Generate Invoice" onClose={() => setInvOpen(false)} wide>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Student *">
              <select className={inputCls} value={invForm.studentId} onChange={(e) => setInvForm((f) => ({ ...f, studentId: e.target.value }))}>
                <option value="">Select…</option>
                {(studentsQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>
                ))}
              </select>
            </Field>
            <Field label="Due date *">
              <input className={inputCls} type="date" value={invForm.dueDate} onChange={(e) => setInvForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Invoice items</p>
            <div className="space-y-2">
              {invItems.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={`${inputCls} flex-1`} placeholder="Item name" value={it.name} onChange={(e) => setItem(invItems, setInvItems, i, 'name', e.target.value)} />
                  <input className={`${inputCls} w-32`} type="number" placeholder="Amount" value={it.amount} onChange={(e) => setItem(invItems, setInvItems, i, 'amount', e.target.value)} />
                  <button
                    onClick={() => setInvItems(invItems.filter((_, j) => j !== i))}
                    disabled={invItems.length === 1}
                    className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                    aria-label="Remove item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setInvItems([...invItems, { name: '', amount: '' }])} className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800">
              + Add item
            </button>
          </div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <IndianRupee className="h-4 w-4 text-indigo-500" />
            Total: {money(invItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0))}
          </p>
          <button
            onClick={() => {
              setError(null)
              if (!invForm.studentId || !invForm.dueDate) {
                setError('Student and due date are required')
                return
              }
              const items = invItems
                .filter((i) => i.name.trim() && i.amount)
                .map((i) => ({ name: i.name.trim(), amount: Number(i.amount) }))
              if (items.length === 0) {
                setError('Add at least one item with an amount')
                return
              }
              const subtotal = items.reduce((sum, i) => sum + i.amount, 0)
              generateInvoice.mutate({
                studentId: invForm.studentId,
                items,
                subtotal,
                totalAmount: subtotal,
                dueDate: invForm.dueDate,
              })
            }}
            disabled={generateInvoice.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {generateInvoice.isPending ? 'Generating…' : 'Generate Invoice'}
          </button>
        </div>
      </Modal>

      <Modal open={payOpen} title="Record Payment" onClose={() => setPayOpen(false)}>
        <div className="space-y-3">
          <Field label="Student *">
            <select className={inputCls} value={payForm.studentId} onChange={(e) => setPayForm((f) => ({ ...f, studentId: e.target.value }))}>
              <option value="">Select…</option>
              {(studentsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount (₹) *">
              <input className={inputCls} type="number" min="1" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Method">
              <select className={inputCls} value={payForm.paymentMethod} onChange={(e) => setPayForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Payment date">
            <input className={inputCls} type="date" value={payForm.paymentDate} onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))} />
          </Field>
          <Field label="Reference number">
            <input className={inputCls} value={payForm.referenceNumber} onChange={(e) => setPayForm((f) => ({ ...f, referenceNumber: e.target.value }))} />
          </Field>
          <Field label="Remarks">
            <input className={inputCls} value={payForm.remarks} onChange={(e) => setPayForm((f) => ({ ...f, remarks: e.target.value }))} />
          </Field>
          <button
            onClick={() => {
              setError(null)
              if (!payForm.studentId || !Number(payForm.amount) || Number(payForm.amount) < 1) {
                setError('Student and a valid amount are required')
                return
              }
              recordPayment.mutate({
                studentId: payForm.studentId,
                amount: Number(payForm.amount),
                paymentMethod: payForm.paymentMethod,
                paymentDate: payForm.paymentDate || undefined,
                referenceNumber: payForm.referenceNumber.trim() || undefined,
                remarks: payForm.remarks.trim() || undefined,
              })
            }}
            disabled={recordPayment.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {recordPayment.isPending ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
