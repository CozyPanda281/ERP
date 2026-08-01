export default function SimpleBars({
  data,
  format,
  height = 140,
}: {
  data: Array<{ label: string; value: number; hint?: string | null }>
  format: (v: number) => string
  height?: number
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d) => (
          <div
            key={d.label}
            className="group relative flex-1 rounded-t bg-indigo-500 transition-colors hover:bg-indigo-600"
            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1)}%` }}
            title={`${d.label}: ${format(d.value)}`}
          >
            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
              {format(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center text-[11px] text-slate-500">
            {d.hint ?? d.label}
          </span>
        ))}
      </div>
    </div>
  )
}
