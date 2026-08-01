import { Construction } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function ComingSoon() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const label = pathname.replace(/^\//, '').replace(/-/g, ' ') || 'portal'

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-24 text-center">
      <Construction className="mb-4 h-10 w-10 text-slate-300" />
      <h2 className="text-lg font-semibold text-slate-800 capitalize">{label} module</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {user?.isSuperAdmin
          ? 'This area is coming soon.'
          : 'This module ships in the next Phase 6 milestone. Your dashboard is already live.'}
      </p>
    </div>
  )
}
