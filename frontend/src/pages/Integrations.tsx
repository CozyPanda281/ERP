import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound,
  Plus,
  Trash2,
  Ban,
  Loader2,
  Webhook,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react'
import { unwrap, api, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { ApiKeyRecord, ApiKeyCreated, WebhookEndpoint, WebhookDelivery } from '../lib/types'

const WEBHOOK_EVENTS = [
  'fee.payment.recorded',
  'fee.invoice.generated',
  'student.created',
  'attendance.marked',
  'test.ping',
]

interface TenantRow {
  id: string
  name: string
  slug: string
  status: string | null
}

function fmtDate(v: string | null): string {
  if (!v) return '—'
  return new Date(v).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Integrations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isSuperAdmin = !!user?.isSuperAdmin
  const [tenantId, setTenantId] = useState<string>('')
  const config = tenantId ? { headers: { 'X-Tenant-Id': tenantId } } : {}

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const res = await api.get('/tenants', { params: { page: 1, limit: 500 } })
      return (res.data?.data?.data ?? res.data?.data ?? []) as TenantRow[]
    },
    enabled: isSuperAdmin,
  })
  const tenants = tenantsQuery.data ?? []

  useEffect(() => {
    if (isSuperAdmin && tenants.length && !tenants.some((t) => t.id === tenantId)) {
      setTenantId(tenants[0]?.id ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, tenants])

  // ---- API keys ----
  const keysQuery = useQuery({
    queryKey: ['api-keys', tenantId],
    queryFn: () => unwrap<ApiKeyRecord[]>(api.get('/api-keys', config)),
    enabled: !isSuperAdmin || !!tenantId,
  })

  const createKey = useMutation({
    mutationFn: (body: { name: string; scopes: string; rateLimitPerMinute: number }) =>
      unwrap<ApiKeyCreated>(api.post('/api-keys', body, config)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const revokeKey = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.post(`/api-keys/${id}/revoke`, {}, config)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const deleteKey = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/api-keys/${id}`, config)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  // ---- Webhooks ----
  const webhooksQuery = useQuery({
    queryKey: ['webhooks', tenantId],
    queryFn: () => unwrap<WebhookEndpoint[]>(api.get('/webhooks', config)),
    enabled: !isSuperAdmin || !!tenantId,
  })

  const deliveriesQuery = useQuery({
    queryKey: ['webhook-deliveries', tenantId],
    queryFn: () => unwrap<WebhookDelivery[]>(api.get('/webhooks/deliveries', { ...config, params: { limit: 10 } })),
    enabled: !isSuperAdmin || !!tenantId,
  })

  const createWebhook = useMutation({
    mutationFn: (body: { name: string; url: string; secret: string; events: string; description?: string }) =>
      unwrap<WebhookEndpoint>(api.post('/webhooks', body, config)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })

  const testWebhook = useMutation({
    mutationFn: (id: string) => unwrap<{ event: string }>(api.post(`/webhooks/${id}/test`, {}, config)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })

  const deleteWebhook = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.delete(`/webhooks/${id}`, config)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] })
    },
  })

  const retryDelivery = useMutation({
    mutationFn: (id: string) => unwrap<{ success: boolean }>(api.post(`/webhooks/deliveries/${id}/retry`, {}, config)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] })
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] }), 2500)
    },
  })

  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState('read')
  const [newKeyRate, setNewKeyRate] = useState(60)
  const [createdSecret, setCreatedSecret] = useState<{ name: string; secret: string } | null>(null)
  const [revealed, setRevealed] = useState(false)

  const [whName, setWhName] = useState('')
  const [whUrl, setWhUrl] = useState('')
  const [whSecret, setWhSecret] = useState('')
  const [whEvents, setWhEvents] = useState<string[]>([])
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageInfo, setPageInfo] = useState<string | null>(null)

  const submitKey = () => {
    setPageError(null)
    setPageInfo(null)
    if (!newKeyName.trim()) {
      setPageError('Key name is required')
      return
    }
    createKey.mutate(
      { name: newKeyName.trim(), scopes: newKeyScopes, rateLimitPerMinute: newKeyRate },
      {
        onSuccess: (res) => {
          setCreatedSecret({ name: res.key.name, secret: res.secret })
          setNewKeyName('')
          setNewKeyScopes('read')
          setNewKeyRate(60)
        },
        onError: (e) => setPageError(errorMessage(e)),
      },
    )
  }

  const submitWebhook = () => {
    setPageError(null)
    setPageInfo(null)
    if (!whName.trim() || !whUrl.trim() || whSecret.length < 16) {
      setPageError('Name, a valid URL and a secret of 16+ characters are required')
      return
    }
    createWebhook.mutate(
      {
        name: whName.trim(),
        url: whUrl.trim(),
        secret: whSecret.trim(),
        events: whEvents.length ? whEvents.join(',') : '*',
      },
      {
        onSuccess: () => {
          setWhName('')
          setWhUrl('')
          setWhSecret('')
          setWhEvents([])
          setPageInfo('Webhook endpoint created')
        },
        onError: (e) => setPageError(errorMessage(e)),
      },
    )
  }

  const copySecret = (secret: string) => {
    navigator.clipboard?.writeText(secret)
    setPageInfo('Secret copied — store it now, it cannot be shown again')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Integrations</h2>
          <p className="mt-1 text-sm text-slate-500">
            API keys for external systems and webhooks for real-time event delivery.
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Tenant
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                {!tenantId && <option value="">Select a tenant…</option>}
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{pageError}</div>
      )}
      {pageInfo && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {pageInfo}
        </div>
      )}

      {createdSecret && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-900">API key created — copy it now</h3>
          <p className="mt-1 text-xs text-amber-700">
            The secret is shown only once. Anyone with it can read your data via the public API.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-amber-300">
              {revealed ? createdSecret.secret : 'erp_live_••••••••••••••••••••••'}
            </code>
            <button
              onClick={() => setRevealed((v) => !v)}
              className="rounded-lg bg-white p-2 text-slate-500 ring-1 ring-amber-300 hover:text-slate-800"
              title={revealed ? 'Hide' : 'Reveal'}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={() => copySecret(createdSecret.secret)}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <Copy className="mr-1 inline h-4 w-4" /> Copy
            </button>
            <button
              onClick={() => setCreatedSecret(null)}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <KeyRound className="h-4 w-4 text-indigo-600" /> API Keys
          </h3>
          <div className="flex gap-2">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. payments gateway)"
              className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={newKeyScopes}
              onChange={(e) => setNewKeyScopes(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="read">read</option>
              <option value="read,write">read,write</option>
            </select>
            <input
              type="number"
              value={newKeyRate}
              onChange={(e) => setNewKeyRate(Number(e.target.value))}
              title="Requests per minute"
              className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              onClick={submitKey}
              disabled={createKey.isPending}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {createKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {keysQuery.isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {keysQuery.data?.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {key.name}
                  {!key.isActive && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      REVOKED
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {key.keyPrefix}•••••••• · {key.scopes} · {key.rateLimitPerMinute} req/min · last used{' '}
                  {fmtDate(key.lastUsedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {key.isActive && (
                  <button
                    onClick={() => revokeKey.mutate(key.id)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                  >
                    <Ban className="h-3.5 w-3.5" /> Revoke
                  </button>
                )}
                <button
                  onClick={() => deleteKey.mutate(key.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
          {!keysQuery.isLoading && !keysQuery.data?.length && (
            <p className="text-sm text-slate-400">No API keys yet. Create one to call the public API.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Webhook className="h-4 w-4 text-violet-600" /> Webhook Endpoints
        </h3>

        <div className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
          <input
            value={whName}
            onChange={(e) => setWhName(e.target.value)}
            placeholder="Name (e.g. payment bot)"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
          />
          <input
            value={whUrl}
            onChange={(e) => setWhUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
          />
          <input
            value={whSecret}
            onChange={(e) => setWhSecret(e.target.value)}
            placeholder="Signing secret (16+ chars)"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none sm:col-span-2"
          />
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <span className="text-xs text-slate-500">Events (empty = all):</span>
            {WEBHOOK_EVENTS.map((ev) => (
              <label
                key={ev}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium ${
                  whEvents.includes(ev)
                    ? 'bg-violet-600 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={whEvents.includes(ev)}
                  onChange={() =>
                    setWhEvents((prev) =>
                      prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev],
                    )
                  }
                />
                {ev}
              </label>
            ))}
          </div>
          <button
            onClick={submitWebhook}
            disabled={createWebhook.isPending}
            className="flex items-center gap-1 justify-self-start rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 sm:col-span-2"
          >
            {createWebhook.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add endpoint
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {webhooksQuery.data?.map((wh) => (
            <div key={wh.id} className="rounded-lg border border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {wh.name}
                    {wh.lastDeliveryStatus === 'success' && (
                      <CheckCircle2 className="ml-2 inline h-4 w-4 text-emerald-500" />
                    )}
                    {wh.lastDeliveryStatus === 'failed' && (
                      <XCircle className="ml-2 inline h-4 w-4 text-red-500" />
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {wh.url} · events: {wh.events} · last delivery {fmtDate(wh.lastDeliveryAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testWebhook.mutate(wh.id)}
                    disabled={testWebhook.isPending}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
                  >
                    <Zap className="h-3.5 w-3.5" /> Test ping
                  </button>
                  <button
                    onClick={() => deleteWebhook.mutate(wh.id)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!webhooksQuery.isLoading && !webhooksQuery.data?.length && (
            <p className="text-sm text-slate-400">No webhook endpoints yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Clock className="h-4 w-4 text-slate-500" /> Recent Deliveries
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-3">Event</th>
                <th className="pb-2 pr-3">Endpoint</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Attempts</th>
                <th className="pb-2 pr-3">Response</th>
                <th className="pb-2 pr-3">Sent</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {deliveriesQuery.data?.map((d) => (
                <tr key={d.id} className="border-b border-slate-50">
                  <td className="py-2 pr-3 font-medium text-slate-800">{d.event}</td>
                  <td className="max-w-[180px] truncate py-2 pr-3 text-xs text-slate-500" title={d.endpointUrl}>
                    {d.endpointName}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        d.status === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : d.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-600">
                    {d.attempts}/{d.maxAttempts}
                  </td>
                  <td className="py-2 pr-3 text-xs text-slate-500">
                    {d.responseStatus ? `HTTP ${d.responseStatus}` : d.error ? d.error.slice(0, 40) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-xs text-slate-500">{fmtDate(d.sentAt)}</td>
                  <td className="py-2 text-right">
                    {d.status === 'failed' && (
                      <button
                        onClick={() => retryDelivery.mutate(d.id)}
                        disabled={retryDelivery.isPending}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!deliveriesQuery.isLoading && !deliveriesQuery.data?.length && (
                <tr>
                  <td colSpan={7} className="py-3 text-sm text-slate-400">
                    No deliveries yet — trigger an event or send a test ping.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
