import type { LucideIcon } from 'lucide-react'

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'text-indigo-600',
}: {
  label: string
  value: number | string
  icon: LucideIcon
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  )
}
