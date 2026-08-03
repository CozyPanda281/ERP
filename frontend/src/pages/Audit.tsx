import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'

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

interface AuditLog {
  id: string
  tenantId: string | null
  userId: string | null
  action: string
  module: string
  resourceType: string | null
  resourceId: string | null
  description: string | null
  ipAddress: string | null
  outcome: string | null
  createdAt: string | null
}

export default function Audit() {
  const [action, setAction] = useState('')
  const [module, setModule] = useState('')
  const [outcome, setOutcome] = useState('')
  const [page, setPage] = useState(1)

  const listQuery = useQuery({
    queryKey: ['audit-logs', action, module, outcome, page],
    queryFn: () =>
      api.get('/audit', {
        params: {
          page,
          limit: 25,
          ...(action ? { action } : {}),
          ...(module ? { module } : {}),
          ...(outcome ? { outcome } : {}),
        },
      }),
  })
  const logsData = listQuery.data?.data?.data
  const logs = (logsData?.data ?? []) as AuditLog[]
  const pagination = logsData?.pagination ?? { total: 0 }

  const statsQuery = useQuery({
    queryKey: ['audit-module-stats'],
    queryFn: () => api.get('/audit/stats/modules'),
  })
  const statsRaw = (statsQuery.data?.data?.data ?? []) as { module: string; count: string }[]
  const byModule = new Map<string, number>()
  for (const s of statsRaw) byModule.set(s.module, (byModule.get(s.module) ?? 0) + Number(s.count))
  const stats = [...byModule.entries()]
    .map(([module, count]) => ({ module, count: String(count) }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 4)

  const outcomeTone = (o: string | null): 'green' | 'red' | 'slate' => (o === 'success' ? 'green' : o === 'failure' ? 'red' : 'slate')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">All actions across the platform</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.slice(0, 4).map((s) => (
          <div key={s.module} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <ShieldCheck size={14} className="text-indigo-500" />
              {s.module}
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{s.count}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(1)
          }}
          placeholder="Action (e.g. post_create)"
          className={`${inputCls} !w-52`}
        />
        <input
          value={module}
          onChange={(e) => {
            setModule(e.target.value)
            setPage(1)
          }}
          placeholder="Module"
          className={`${inputCls} !w-40`}
        />
        <select
          value={outcome}
          onChange={(e) => {
            setOutcome(e.target.value)
            setPage(1)
          }}
          className={`${inputCls} !w-36`}
        >
          <option value="">All outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </div>

      {listQuery.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          No audit logs match
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="indigo">{l.module}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{l.action}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-72 truncate">{l.description ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{l.userId ? l.userId.slice(0, 8) : '—'}</td>
                  <td className="px-4 py-3"><Badge tone={outcomeTone(l.outcome)}>{l.outcome ?? '—'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">
              Page {pagination.page ?? page} of {Math.max(1, Math.ceil((pagination.total ?? 0) / (pagination.limit ?? 25)))}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil((pagination.total ?? 0) / (pagination.limit ?? 25))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
