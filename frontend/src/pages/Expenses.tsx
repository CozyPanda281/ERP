import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, CreditCard, Wallet, Tags, TrendingDown, TrendingUp } from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

const TABS = [
  { id: 'expenses', label: 'Expenses', icon: TrendingDown },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'categories', label: 'Categories', icon: Tags },
] as const

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
      <div className="my-8 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
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

interface ExpenseRow {
  id: string
  amount: string
  description: string
  expenseDate: string | null
  categoryId: string | null
  paymentMethod: string | null
  referenceNumber: string | null
  vendorName: string | null
  billNumber: string | null
}

interface IncomeRow {
  id: string
  amount: string
  description: string
  incomeDate: string | null
  categoryId: string | null
  paymentMethod: string | null
  referenceNumber: string | null
}

interface CategoryRow {
  id: string
  name: string
  description: string | null
}

const EMPTY_EXPENSE = {
  categoryId: '',
  amount: '',
  description: '',
  expenseDate: '',
  paymentMethod: 'cash',
  referenceNumber: '',
  vendorName: '',
  billNumber: '',
}

const EMPTY_INCOME = {
  categoryId: '',
  amount: '',
  description: '',
  incomeDate: '',
  paymentMethod: 'cash',
  referenceNumber: '',
}

const EMPTY_CAT = { name: '', description: '' }

export default function Expenses() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const tenantId = user?.tenantId ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('expenses')
  const [catKind, setCatKind] = useState<'expense' | 'income'>('expense')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE)
  const [incomeForm, setIncomeForm] = useState(EMPTY_INCOME)
  const [catForm, setCatForm] = useState(EMPTY_CAT)

  const expCatsQuery = useQuery({
    queryKey: ['expense-categories', tenantId],
    queryFn: () => unwrap<CategoryRow[]>(api.get('/expenses/expense-categories')),
    select: (d) => (Array.isArray(d) ? d : []),
    enabled: !!tenantId,
  })

  const incCatsQuery = useQuery({
    queryKey: ['income-categories', tenantId],
    queryFn: () => unwrap<CategoryRow[]>(api.get('/expenses/income-categories')),
    select: (d) => (Array.isArray(d) ? d : []),
    enabled: !!tenantId,
  })

  const expensesQuery = useQuery({
    queryKey: ['expenses', branchId],
    queryFn: () => api.get('/expenses', { params: { page: 1, limit: 100 } }),
    select: (res) => (res.data as { data: ExpenseRow[] }).data ?? [],
    enabled: !!branchId,
  })

  const incomeQuery = useQuery({
    queryKey: ['income', branchId],
    queryFn: () => api.get('/expenses/income', { params: { page: 1, limit: 100 } }),
    select: (res) => (res.data as { data: IncomeRow[] }).data ?? [],
    enabled: !!branchId,
  })

  const createExpense = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<ExpenseRow>(api.post('/expenses', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setExpenseOpen(false)
      setExpenseForm(EMPTY_EXPENSE)
      setInfo('Expense recorded')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const createIncome = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<IncomeRow>(api.post('/expenses/income', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] })
      setIncomeOpen(false)
      setIncomeForm(EMPTY_INCOME)
      setInfo('Income recorded')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const createCategory = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      unwrap<CategoryRow>(api.post(`/expenses/${catKind === 'expense' ? 'expense' : 'income'}-categories`, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [catKind === 'expense' ? 'expense-categories' : 'income-categories'],
      })
      setCatOpen(false)
      setCatForm(EMPTY_CAT)
      setInfo(`${catKind === 'expense' ? 'Expense' : 'Income'} category created`)
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submitExpense = () => {
    setError(null)
    setInfo(null)
    if (!expenseForm.amount || !expenseForm.description.trim() || !expenseForm.expenseDate) {
      setError('Amount, description and date are required')
      return
    }
    const body: Record<string, unknown> = { ...expenseForm }
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' && !v.trim()) body[k] = undefined
    }
    createExpense.mutate(body)
  }

  const submitIncome = () => {
    setError(null)
    setInfo(null)
    if (!incomeForm.amount || !incomeForm.description.trim() || !incomeForm.incomeDate) {
      setError('Amount, description and date are required')
      return
    }
    const body: Record<string, unknown> = { ...incomeForm }
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' && !v.trim()) body[k] = undefined
    }
    createIncome.mutate(body)
  }

  const submitCategory = () => {
    setError(null)
    setInfo(null)
    if (!catForm.name.trim()) {
      setError('Category name is required')
      return
    }
    createCategory.mutate({ name: catForm.name.trim(), description: catForm.description.trim() || undefined })
  }

  const expenses = expensesQuery.data ?? []
  const income = incomeQuery.data ?? []
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const totalIncome = income.reduce((sum, i) => sum + Number(i.amount || 0), 0)
  const expCatName = (id: string | null) => expCatsQuery.data?.find((c) => c.id === id)?.name ?? '—'
  const incCatName = (id: string | null) => incCatsQuery.data?.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Expenses &amp; Income</h2>
          <p className="text-sm text-slate-500">Track money in and out</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'expenses' && (
            <button
              onClick={() => setExpenseOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Record Expense
            </button>
          )}
          {tab === 'income' && (
            <button
              onClick={() => setIncomeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Record Income
            </button>
          )}
          {tab === 'categories' && (
            <button
              onClick={() => setCatOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> New Category
            </button>
          )}
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-red-600">
            <TrendingDown className="h-4 w-4" /> Total expenses
          </p>
          <p className="mt-1 text-xl font-semibold text-red-700">₹{totalExpenses.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-600">
            <TrendingUp className="h-4 w-4" /> Total income
          </p>
          <p className="mt-1 text-xl font-semibold text-emerald-700">₹{totalIncome.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Wallet className="h-4 w-4" /> Net
          </p>
          <p className={`mt-1 text-xl font-semibold ${totalIncome - totalExpenses >= 0 ? 'text-slate-900' : 'text-red-700'}`}>
            ₹{(totalIncome - totalExpenses).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === 'expenses' &&
          (expensesQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-600">{e.expenseDate ? new Date(e.expenseDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{e.description}</p>
                      {e.billNumber && <p className="text-xs text-slate-400">Bill {e.billNumber}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{expCatName(e.categoryId)}</td>
                    <td className="px-4 py-3 text-slate-600">{e.vendorName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.paymentMethod ? e.paymentMethod.replace('_', ' ') : '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">-₹{Number(e.amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <CreditCard className="mx-auto mb-2 h-8 w-8" /> No expenses yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ))}

        {tab === 'income' &&
          (incomeQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {income.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-600">{i.incomeDate ? new Date(i.incomeDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{i.description}</td>
                    <td className="px-4 py-3 text-slate-600">{incCatName(i.categoryId)}</td>
                    <td className="px-4 py-3 text-slate-600">{i.paymentMethod ? i.paymentMethod.replace('_', ' ') : '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">+₹{Number(i.amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {income.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">No income recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ))}

        {tab === 'categories' && (
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <section>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-600">
                <TrendingDown className="h-4 w-4" /> Expense categories ({expCatsQuery.data?.length ?? 0})
              </h4>
              <div className="space-y-2">
                {(expCatsQuery.data ?? []).map((c) => (
                  <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">{c.name}</p>
                    {c.description && <p className="text-xs text-slate-500">{c.description}</p>}
                  </div>
                ))}
                {(expCatsQuery.data ?? []).length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">None yet</p>
                )}
              </div>
            </section>
            <section>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <TrendingUp className="h-4 w-4" /> Income categories ({incCatsQuery.data?.length ?? 0})
              </h4>
              <div className="space-y-2">
                {(incCatsQuery.data ?? []).map((c) => (
                  <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">{c.name}</p>
                    {c.description && <p className="text-xs text-slate-500">{c.description}</p>}
                  </div>
                ))}
                {(incCatsQuery.data ?? []).length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">None yet</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <Modal open={expenseOpen} title="Record Expense" onClose={() => setExpenseOpen(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹)" required>
              <input className={inputCls} type="number" min={0} value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Date" required>
              <input className={inputCls} type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm((f) => ({ ...f, expenseDate: e.target.value }))} />
            </Field>
          </div>
          <Field label="Description" required>
            <input className={inputCls} value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Category">
            <select className={inputCls} value={expenseForm.categoryId} onChange={(e) => setExpenseForm((f) => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Select…</option>
              {(expCatsQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment method">
              <select className={inputCls} value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                {['cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other'].map((m) => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </Field>
            <Field label="Vendor name">
              <input className={inputCls} value={expenseForm.vendorName} onChange={(e) => setExpenseForm((f) => ({ ...f, vendorName: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bill number">
              <input className={inputCls} value={expenseForm.billNumber} onChange={(e) => setExpenseForm((f) => ({ ...f, billNumber: e.target.value }))} />
            </Field>
            <Field label="Reference">
              <input className={inputCls} value={expenseForm.referenceNumber} onChange={(e) => setExpenseForm((f) => ({ ...f, referenceNumber: e.target.value }))} />
            </Field>
          </div>
          <button
            onClick={submitExpense}
            disabled={createExpense.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createExpense.isPending ? 'Saving…' : 'Record Expense'}
          </button>
        </div>
      </Modal>

      <Modal open={incomeOpen} title="Record Income" onClose={() => setIncomeOpen(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹)" required>
              <input className={inputCls} type="number" min={0} value={incomeForm.amount} onChange={(e) => setIncomeForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Date" required>
              <input className={inputCls} type="date" value={incomeForm.incomeDate} onChange={(e) => setIncomeForm((f) => ({ ...f, incomeDate: e.target.value }))} />
            </Field>
          </div>
          <Field label="Description" required>
            <input className={inputCls} value={incomeForm.description} onChange={(e) => setIncomeForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Category">
            <select className={inputCls} value={incomeForm.categoryId} onChange={(e) => setIncomeForm((f) => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Select…</option>
              {(incCatsQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment method">
              <select className={inputCls} value={incomeForm.paymentMethod} onChange={(e) => setIncomeForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                {['cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other'].map((m) => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </Field>
            <Field label="Reference">
              <input className={inputCls} value={incomeForm.referenceNumber} onChange={(e) => setIncomeForm((f) => ({ ...f, referenceNumber: e.target.value }))} />
            </Field>
          </div>
          <button
            onClick={submitIncome}
            disabled={createIncome.isPending}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {createIncome.isPending ? 'Saving…' : 'Record Income'}
          </button>
        </div>
      </Modal>

      <Modal open={catOpen} title="New Category" onClose={() => setCatOpen(false)}>
        <div className="space-y-3">
          <Field label="Category type">
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setCatKind(k)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize ${
                    catKind === k ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Name" required>
            <input className={inputCls} value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Description">
            <input className={inputCls} value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <button
            onClick={submitCategory}
            disabled={createCategory.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createCategory.isPending ? 'Creating…' : 'Create Category'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
