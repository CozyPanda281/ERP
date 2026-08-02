import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, Pin, Megaphone, CalendarDays } from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'

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
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
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

interface Announcement {
  id: string
  tenantId: string
  branchId: string
  title: string
  content: string
  targetRoles: string[] | null
  targetClasses: string[] | null
  attachmentUrls: string[] | null
  priority: string | null
  isPinned: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdBy: string | null
  createdAt?: string | null
}

const fmtDate = (v: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent']

export default function Notices() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [priority, setPriority] = useState('')
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', priority: 'medium', isPinned: false, targetRoles: '' })

  const listQuery = useQuery({
    queryKey: ['announcements', priority, pinnedOnly],
    queryFn: () =>
      unwrap<Announcement[]>(
        api.get('/communication/announcements', {
          params: { page: 1, limit: 50, priority: priority || undefined, isPinned: pinnedOnly ? 'true' : undefined },
        }),
      ),
  })

  const createAnnouncement = useMutation({
    mutationFn: (body: Record<string, unknown>) => unwrap<Announcement>(api.post('/communication/announcements', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setCreateOpen(false)
      setForm({ title: '', content: '', priority: 'medium', isPinned: false, targetRoles: '' })
      setInfo('Announcement published')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const deleteAnnouncement = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/communication/announcements/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setInfo('Announcement deleted')
    },
    onError: (e) => setError(errorMessage(e)),
  })

  const submit = () => {
    setError(null)
    setInfo(null)
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required')
      return
    }
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      content: form.content.trim(),
      priority: form.priority,
      isPinned: form.isPinned,
    }
    const roles = form.targetRoles
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
    if (roles.length) body.targetRoles = roles
    createAnnouncement.mutate(body)
  }

  const priorityTone = (p: string | null): 'indigo' | 'green' | 'slate' | 'red' | 'amber' => {
    if (p === 'urgent') return 'red'
    if (p === 'high') return 'amber'
    if (p === 'low') return 'slate'
    return 'indigo'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Notices &amp; Announcements</h2>
          <p className="text-sm text-slate-500">Publish and manage announcements</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Announcement
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

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <select className={`${inputCls} w-auto`} value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            checked={pinnedOnly}
            onChange={(e) => setPinnedOnly(e.target.checked)}
          />
          Pinned only
        </label>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {(listQuery.data ?? []).map((a) => (
            <article key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Megaphone className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                    {a.isPinned && <Badge tone="amber"><Pin className="h-3 w-3" /> Pinned</Badge>}
                    <Badge tone={priorityTone(a.priority)}>{a.priority ?? 'medium'}</Badge>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">{a.content}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(a.publishedAt ?? a.createdAt ?? null)}
                    </span>
                    {a.targetRoles && a.targetRoles.length > 0 && (
                      <span>For: {a.targetRoles.join(', ')}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${a.title}"?`)) deleteAnnouncement.mutate(a.id)
                  }}
                  className="text-slate-300 transition-colors hover:text-red-500"
                  aria-label="Delete announcement"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
          {(listQuery.data ?? []).length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">No announcements yet.</p>
          )}
        </div>
      )}

      <Modal open={createOpen} title="New Announcement" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <textarea
            className={`${inputCls} min-h-28`}
            placeholder="Content *"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className={inputCls} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              className={inputCls}
              placeholder="Target roles (comma-separated, optional)"
              value={form.targetRoles}
              onChange={(e) => setForm((f) => ({ ...f, targetRoles: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              checked={form.isPinned}
              onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
            />
            Pin to top
          </label>
          <button
            onClick={submit}
            disabled={createAnnouncement.isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createAnnouncement.isPending ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
