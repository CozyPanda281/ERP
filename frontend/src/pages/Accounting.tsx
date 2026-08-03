import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, Eye } from 'lucide-react'
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

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const

interface Account {
  id: string
  accountCode: string
  accountName: string
  accountType: string
  parentId: string | null
  description: string | null
  openingBalance: string | null
  status: string | null
}

interface JournalEntry {
  id: string
  entryDate: string | null
  reference: string | null
  description: string | null
  entryType: string | null
}

interface JournalItem {
  id: string
  accountId: string
  debit: string | null
  credit: string | null
  description: string | null
}

interface ReportRow {
  id: string
  accountCode: string
  accountName: string
  account_type?: string
  total_debit?: string
  total_credit?: string
  balance?: string
}

const EMPTY_ACCOUNT = {
  accountCode: '',
  accountName: '',
  accountType: 'asset',
  parentId: '',
  description: '',
  openingBalance: '',
}

const EMPTY_ENTRY = {
  entryDate: new Date().toISOString().slice(0, 10),
  reference: '',
  description: '',
  entryType: '',
}

const today = new Date().toISOString().slice(0, 10)

export default function Accounting() {
  const { user } = useAuth()
  const branchId = user?.branchId ?? ''
  const isOwner = user?.roles.includes('organization-owner')
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [tab, setTab] = useState<'accounts' | 'entries' | 'reports'>('accounts')
  const [reportTab, setReportTab] = useState<'trial' | 'income' | 'balance'>('trial')
  const [accOpen, setAccOpen] = useState(false)
  const [entryOpen, setEntryOpen] = useState(false)
  const [detail, setDetail] = useState<JournalEntry | null>(null)
  const [accForm, setAccForm] = useState({ ...EMPTY_ACCOUNT })
  const [entryForm, setEntryForm] = useState({ ...EMPTY_ENTRY })
  const [lines, setLines] = useState<{ accountId: string; debit: string; credit: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`)
  const [toDate, setToDate] = useState(today)

  const accountsQuery = useQuery({
    queryKey: ['accounts', branchId],
    queryFn: () => api.get('/accounting/accounts', { params: { page: 1, limit: 100 } }),
  })
  const accounts = (accountsQuery.data?.data?.data ?? []) as Account[]

  const entriesQuery = useQuery({
    queryKey: ['journal-entries', branchId],
    queryFn: () => api.get('/accounting/journal-entries', { params: { page: 1, limit: 100 } }),
  })
  const entries = (entriesQuery.data?.data?.data ?? []) as JournalEntry[]

  const detailQuery = useQuery({
    queryKey: ['journal-entry', detail?.id],
    queryFn: () => api.get(`/accounting/journal-entries/${detail!.id}`),
    enabled: !!detail,
  })
  const detailItems = (detailQuery.data?.data?.data?.items ?? []) as JournalItem[]

  const trialQuery = useQuery({
    queryKey: ['trial-balance', branchId, fromDate, toDate],
    queryFn: () =>
      api.get('/accounting/trial-balance', {
        params: { fromDate, toDate },
      }),
    enabled: tab === 'reports' && reportTab === 'trial',
  })
  const trialRows = (trialQuery.data?.data?.data ?? []) as ReportRow[]

  const incomeQuery = useQuery({
    queryKey: ['income-statement', branchId, fromDate, toDate],
    queryFn: () =>
      api.get('/accounting/income-statement', {
        params: { fromDate, toDate },
      }),
    enabled: tab === 'reports' && reportTab === 'income',
  })
  const incomeData = incomeQuery.data?.data?.data

  const balanceQuery = useQuery({
    queryKey: ['balance-sheet', branchId, toDate],
    queryFn: () =>
      api.get('/accounting/balance-sheet', {
        params: { asOfDate: toDate },
      }),
    enabled: tab === 'reports' && reportTab === 'balance',
  })
  const balanceData = balanceQuery.data?.data?.data

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.accountName ?? id.slice(0, 8)

  const typeTone = (t: string): 'indigo' | 'green' | 'slate' | 'red' | 'amber' =>
    t === 'asset' ? 'indigo' : t === 'income' ? 'green' : t === 'expense' ? 'red' : t === 'liability' ? 'amber' : 'slate'

  const createAccount = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/accounting/accounts', {
          accountCode: accForm.accountCode,
          accountName: accForm.accountName,
          accountType: accForm.accountType,
          parentId: accForm.parentId || undefined,
          description: accForm.description || undefined,
          openingBalance: accForm.openingBalance ? Number(accForm.openingBalance) : undefined,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setAccOpen(false)
      setAccForm({ ...EMPTY_ACCOUNT })
      setInfo('Account created')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const deleteAccount = useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/accounting/accounts/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setInfo('Account deleted')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const createEntry = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/accounting/journal-entries', {
          entryDate: entryForm.entryDate,
          reference: entryForm.reference || undefined,
          description: entryForm.description || undefined,
          entryType: entryForm.entryType || undefined,
          items: lines.map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          })),
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
      queryClient.invalidateQueries({ queryKey: ['income-statement'] })
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] })
      setEntryOpen(false)
      setEntryForm({ ...EMPTY_ENTRY })
      setLines([])
      setInfo('Journal entry posted')
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const addLine = () => setLines([...lines, { accountId: '', debit: '', credit: '' }])
  const updateLine = (i: number, patch: Partial<{ accountId: string; debit: string; credit: string }>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const trialTotals = trialRows.reduce(
    (acc, r) => ({
      debit: acc.debit + Number(r.total_debit ?? 0),
      credit: acc.credit + Number(r.total_credit ?? 0),
    }),
    { debit: 0, credit: 0 },
  )

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
          <h1 className="text-lg font-semibold text-slate-900">Accounting</h1>
          <p className="text-sm text-slate-500">Chart of accounts, journal entries and reports</p>
        </div>
        <div className="flex gap-2">
          {tab === 'accounts' && (
            <button
              onClick={() => setAccOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> New Account
            </button>
          )}
          {tab === 'entries' && (
            <button
              onClick={() => {
                setLines([{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }])
                setEntryOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Journal Entry
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
          {(['accounts', 'entries', 'reports'] as const).map((t) => (
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
        {tab === 'reports' && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
            {([
              ['trial', 'Trial Balance'],
              ['income', 'Income Statement'],
              ['balance', 'Balance Sheet'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setReportTab(k)}
                className={`rounded-md px-4 py-1.5 font-medium transition ${
                  reportTab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'accounts' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Opening Balance</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.accountCode}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.accountName}</td>
                  <td className="px-4 py-3"><Badge tone={typeTone(a.accountType)}>{a.accountType}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{a.openingBalance ?? '0'}</td>
                  <td className="px-4 py-3">
                    {isOwner && (
                      <button onClick={() => deleteAccount.mutate(a.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'entries' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{e.entryDate ? String(e.entryDate).slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.reference ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-800">{e.description ?? '—'}</td>
                  <td className="px-4 py-3"><Badge tone={e.entryType ? 'indigo' : 'slate'}>{e.entryType ?? 'general'}</Badge></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setDetail(e)
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`${inputCls} !w-40`}
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`${inputCls} !w-40`}
            />
          </div>

          {reportTab === 'trial' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Debit</th>
                    <th className="px-4 py-3 text-right font-medium">Credit</th>
                    <th className="px-4 py-3 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trialRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.accountCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.accountName}</td>
                      <td className="px-4 py-3"><Badge tone={typeTone(r.account_type ?? '')}>{r.account_type ?? ''}</Badge></td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{Number(r.total_debit ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{Number(r.total_credit ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">{Number(r.balance ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800">
                  <tr>
                    <td className="px-4 py-3" colSpan={3}>Totals</td>
                    <td className="px-4 py-3 text-right tabular-nums">{trialTotals.debit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{trialTotals.credit.toFixed(2)}</td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {reportTab === 'income' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((incomeData?.accounts ?? []) as ReportRow[]).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.accountCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.accountName}</td>
                      <td className="px-4 py-3"><Badge tone={typeTone(r.account_type ?? '')}>{r.account_type ?? ''}</Badge></td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{Number(r.balance ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800">
                  <tr>
                    <td className="px-4 py-3" colSpan={2}>Total Income</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(incomeData?.totalIncome ?? 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3" colSpan={2}>Total Expenses</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(incomeData?.totalExpense ?? 0).toFixed(2)}</td>
                  </tr>
                  <tr className="bg-indigo-50/50">
                    <td className="px-4 py-3" colSpan={2}>Net Income</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(incomeData?.netIncome ?? 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {reportTab === 'balance' && (
            <div className="grid gap-4 lg:grid-cols-3">
              {(
                [
                  ['assets', 'Assets', balanceData?.totalAssets ?? 0],
                  ['liabilities', 'Liabilities', balanceData?.totalLiabilities ?? 0],
                  ['equity', 'Equity', balanceData?.totalEquity ?? 0],
                ] as const
              ).map(([key, label, total]) => (
                <div key={key} className="rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
                    {label} <span className="float-right tabular-nums">{Number(total).toFixed(2)}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {((balanceData?.[key] ?? []) as ReportRow[]).map((r) => (
                      <div key={r.id} className="flex justify-between px-4 py-2 text-sm">
                        <span className="text-slate-600">{r.accountName}</span>
                        <span className="tabular-nums font-medium text-slate-800">{Number(r.balance ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                    {((balanceData?.[key] ?? []) as ReportRow[]).length === 0 && (
                      <div className="px-4 py-6 text-center text-xs text-slate-400">No {label.toLowerCase()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={accOpen} title="New Account" onClose={() => setAccOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createAccount.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account Code" required>
              <input
                required
                value={accForm.accountCode}
                onChange={(e) => setAccForm({ ...accForm, accountCode: e.target.value })}
                placeholder="e.g. 1000"
                className={inputCls}
              />
            </Field>
            <Field label="Type" required>
              <select
                value={accForm.accountType}
                onChange={(e) => setAccForm({ ...accForm, accountType: e.target.value })}
                className={inputCls}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Account Name" required>
            <input
              required
              value={accForm.accountName}
              onChange={(e) => setAccForm({ ...accForm, accountName: e.target.value })}
              placeholder="e.g. Cash"
              className={inputCls}
            />
          </Field>
          <Field label="Parent Account">
            <select
              value={accForm.parentId}
              onChange={(e) => setAccForm({ ...accForm, parentId: e.target.value })}
              className={inputCls}
            >
              <option value="">No parent</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening Balance">
              <input
                type="number"
                step="0.01"
                value={accForm.openingBalance}
                onChange={(e) => setAccForm({ ...accForm, openingBalance: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <input
                value={accForm.description}
                onChange={(e) => setAccForm({ ...accForm, description: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAccOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Create Account
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={entryOpen} title="Journal Entry" onClose={() => setEntryOpen(false)} wide>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSaving(true)
            createEntry.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <Field label="Entry Date" required>
              <input
                type="date"
                required
                value={entryForm.entryDate}
                onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Reference">
              <input
                value={entryForm.reference}
                onChange={(e) => setEntryForm({ ...entryForm, reference: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Entry Type">
              <select
                value={entryForm.entryType}
                onChange={(e) => setEntryForm({ ...entryForm, entryType: e.target.value })}
                className={inputCls}
              >
                <option value="">General</option>
                <option value="sales">Sales</option>
                <option value="purchase">Purchase</option>
                <option value="expense">Expense</option>
                <option value="receipt">Receipt</option>
                <option value="payment">Payment</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <input
              value={entryForm.description}
              onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">Line Items</div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_100px_32px] items-center gap-2">
                  <select
                    required
                    value={l.accountId}
                    onChange={(e) => updateLine(i, { accountId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountCode} — {a.accountName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Debit"
                    value={l.debit}
                    onChange={(e) => updateLine(i, { debit: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Credit"
                    value={l.credit}
                    onChange={(e) => updateLine(i, { credit: e.target.value })}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Remove line"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <Plus size={13} /> Add line
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEntryOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Post Entry
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} title="Journal Entry Details" onClose={() => setDetail(null)} wide>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <span>Date: <span className="font-medium text-slate-800">{detail?.entryDate ? String(detail.entryDate).slice(0, 10) : '—'}</span></span>
            <span>Reference: <span className="font-mono text-slate-800">{detail?.reference ?? '—'}</span></span>
            <span>Type: <span className="font-medium text-slate-800">{detail?.entryType ?? 'general'}</span></span>
          </div>
          {detail?.description && <p className="text-sm text-slate-600">{detail.description}</p>}
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 text-right font-medium">Debit</th>
                  <th className="px-3 py-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailItems.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 text-slate-800">{accountName(it.accountId)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{Number(it.debit ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{Number(it.credit ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  )
}
