import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X, GraduationCap } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { displayName, navFor, primaryRole, ROLE_LABELS } from '../lib/nav'
import { homeFor } from '../lib/nav'

export default function Shell() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  if (!user) return null

  const items = navFor(user)
  const roleLabel = user.isSuperAdmin
    ? ROLE_LABELS['erp-superadmin']
    : ROLE_LABELS[primaryRole(user)] ?? 'User'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-slate-100 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-5">
          <GraduationCap className="h-7 w-7 text-indigo-400" />
          <div>
            <p className="text-sm font-semibold leading-tight">School ERP</p>
            <p className="text-[11px] text-slate-400">{roleLabel}</p>
          </div>
          <button
            className="ml-auto text-slate-400 hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold">
              {displayName(user)
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName(user)}</p>
              <p className="truncate text-[11px] text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 transition-colors hover:text-red-400"
              title="Log out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            className="text-slate-600 hover:text-slate-900 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">{roleLabel} Portal</h1>
          <button
            onClick={() => {
              navigate(homeFor(user))
            }}
            className="ml-auto text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Home
          </button>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
