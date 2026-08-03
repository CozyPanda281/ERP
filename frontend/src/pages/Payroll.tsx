import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Wallet, BadgeCheck } from 'lucide-react'
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

interface PayrollRecord {
  id: string
  staffId: string
  month: number | null
  year: number | null
  basicPay: string | null
  grossPay: string | null
  totalDeductions: string | null
  netPay: string | null
  paymentDate: string | null
  paymentMethod: string | null
  status: string | null
  remarks: string | null
  createdAt: string | null
}

interface SalaryComponent {
  id: string
  name: string
  type: string
  calculationType: string | null
  value: string | null
  isActive: boolean | null
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  designation: string | null
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const EMPTY_PAYROLL = {
  staffId: '',
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  basicPay: '',
  grossPay: '',
  totalDeductions: '',
  netPay: '',
  paymentDate: '',
  paymentMethod: 'bank_transfer',
  transactionRef: '',
  remarks: '',
}

const EMPTY_COMPONENT = {
  name: '',
  type: 'allowance',
  calculationType: 'fixed',
  value: '',
}

export default function Payroll() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tab, setTab] = useState<'records' | 'components'>('records')
  const [statusFilter, setStatusFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [compOpen, setCompOpen] = useState(false)
  const [payForm, setPayForm] = useState({ ...EMPTY_PAYROLL })
  const [compForm, setCompForm] = useState({ ...EMPTY_COMPONENT })
  const [saving, setSaving] = useState(false)

  const staffQuery = useQuery({
    queryKey: ['staff', branchId],
    queryFn: () => api.get('/staff', { params: { page: 1, limit: 200 } }),
  })
  const staff = (staffQuery.data?.data?.data ?? []) as StaffMember[]

  const recordsQuery = useQuery({
    queryKey: ['payroll', branchId, statusFilter, monthFilter, yearFilter],
    queryFn: () =>
      api.get('/payroll', {
        params: {
          page: 1,
          limit: 100,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(monthFilter ? { month: Number(monthFilter) } : {}),
          ...(yearFilter ? { year: Number(yearFilter) } : {}),
        },
      }),
  })
  const recordsData = recordsQuery.data?.data?.data
  const records = (recordsData?.data ?? []) as PayrollRecord[]

  const componentsQuery = useQuery({
    queryKey: ['salary-components', branchId],
    queryFn: () => api.get('/payroll/salary-components'),
  })
  const components = (componentsQuery.data?.data?.data ?? []) as SalaryComponent[]

  const staffName = (id: string) => {
    const s = staff.find((st) => st.id === id)
    return s ? `${s.firstName} ${s.lastName}` : id.slice(0, 8)
  }

  const statusTone = (s: string | null): 'green' | 'amber' | 'slate' | 'red' =>
    s === 'paid' ? 'green' : s === 'draft' ? 'slate' : s === 'processing' ? 'amber' : 'red'

  const createPayroll = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/payroll/process', {
          staffId: payForm.staffId,
          month: Number(payForm.month),
          year: Number(payForm.year),
          basicPay: payForm.basicPay || undefined,
          grossPay: payForm.grossPay || undefined,
          totalDeductions: payForm.totalDeductions || undefined,
          netPay: payForm.netPay || undefined,
          paymentDate: payForm.paymentDate || undefined,
          paymentMethod: payForm.paymentMethod,
          transactionRef: payForm.transactionRef || undefined,
          remarks: payForm.remarks || undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      setPayOpen(false)
      setPayForm({ ...EMPTY_PAYROLL })
      setInfo('Payroll processed')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const createComponent = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/payroll/salary-components', {
          name: compForm.name,
          type: compForm.type,
          calculationType: compForm.calculationType,
          value: compForm.value || undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-components'] })
      setCompOpen(false)
      setCompForm({ ...EMPTY_COMPONENT })
      setInfo('Salary component created')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      unwrap(api.put(`/payroll/${id}/status`, { status })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
      setInfo('Payroll status updated')
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
          <h1 className="text-lg font-semibold text-slate-900">Payroll</h1>
          <p className="text-sm text-slate-500">Process monthly payroll and manage salary components</p>
        </div>
        <div className="flex gap-2">
          {tab === 'records' ? (
            <button
              onClick={() => setPayOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Process Payroll
            </button>
          ) : (
            <button
              onClick={() => setCompOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> New Component
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
        {(['records', 'components'] as const).map((t) => (
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

      {tab === 'records' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className={`${inputCls} !w-40`}
            >
              <option value="">All months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={`${inputCls} !w-24`}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputCls} !w-40`}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {recordsQuery.isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
              No payroll records yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Staff</th>
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 py-3 font-medium">Basic</th>
                    <th className="px-4 py-3 font-medium">Gross</th>
                    <th className="px-4 py-3 font-medium">Net</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{staffName(r.staffId)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.month ? MONTHS[Number(r.month) - 1] : '—'} {r.year ?? ''}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.basicPay ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.grossPay ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.netPay ?? '—'}</td>
                      <td className="px-4 py-3"><Badge tone={statusTone(r.status)}>{r.status ?? '—'}</Badge></td>
                      <td className="px-4 py-3">
                        {r.status === 'draft' ? (
                          <button
                            onClick={() => updateStatus.mutate({ id: r.id, status: 'paid' })}
                            disabled={updateStatus.isPending}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <BadgeCheck size={13} /> Mark Paid
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">{r.paymentMethod ?? '—'}</span>
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
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Calculation</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {components.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3"><Badge tone={c.type === 'allowance' ? 'green' : 'red'}>{c.type}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{c.calculationType ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.value ?? '—'}</td>
                  <td className="px-4 py-3"><Badge tone={c.isActive ? 'green' : 'slate'}>{c.isActive ? 'Yes' : 'No'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={payOpen} title="Process Payroll" onClose={() => setPayOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createPayroll.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Staff" required>
            <select
              required
              value={payForm.staffId}
              onChange={(e) => setPayForm({ ...payForm, staffId: e.target.value })}
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Month" required>
              <select
                required
                value={payForm.month}
                onChange={(e) => setPayForm({ ...payForm, month: e.target.value })}
                className={inputCls}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year" required>
              <input
                type="number"
                min={2020}
                required
                value={payForm.year}
                onChange={(e) => setPayForm({ ...payForm, year: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Basic Pay">
              <input
                type="number"
                step="0.01"
                value={payForm.basicPay}
                onChange={(e) => setPayForm({ ...payForm, basicPay: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Gross Pay">
              <input
                type="number"
                step="0.01"
                value={payForm.grossPay}
                onChange={(e) => setPayForm({ ...payForm, grossPay: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Deductions">
              <input
                type="number"
                step="0.01"
                value={payForm.totalDeductions}
                onChange={(e) => setPayForm({ ...payForm, totalDeductions: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Net Pay">
              <input
                type="number"
                step="0.01"
                value={payForm.netPay}
                onChange={(e) => setPayForm({ ...payForm, netPay: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment Date">
              <input
                type="date"
                value={payForm.paymentDate}
                onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Payment Method">
              <select
                value={payForm.paymentMethod}
                onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                className={inputCls}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
            </Field>
          </div>
          <Field label="Transaction Ref">
            <input
              value={payForm.transactionRef}
              onChange={(e) => setPayForm({ ...payForm, transactionRef: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Remarks">
            <textarea
              rows={2}
              value={payForm.remarks}
              onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPayOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} <Wallet size={14} /> Process
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={compOpen} title="New Salary Component" onClose={() => setCompOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createComponent.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <Field label="Name" required>
            <input
              required
              value={compForm.name}
              onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
              placeholder="e.g. House Rent Allowance"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" required>
              <select
                value={compForm.type}
                onChange={(e) => setCompForm({ ...compForm, type: e.target.value })}
                className={inputCls}
              >
                <option value="allowance">Allowance</option>
                <option value="deduction">Deduction</option>
              </select>
            </Field>
            <Field label="Calculation">
              <select
                value={compForm.calculationType}
                onChange={(e) => setCompForm({ ...compForm, calculationType: e.target.value })}
                className={inputCls}
              >
                <option value="fixed">Fixed</option>
                <option value="percentage">Percentage</option>
              </select>
            </Field>
          </div>
          <Field label="Value">
            <input
              type="number"
              step="0.01"
              value={compForm.value}
              onChange={(e) => setCompForm({ ...compForm, value: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCompOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Create Component
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
