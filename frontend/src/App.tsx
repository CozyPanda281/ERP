import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { homeFor } from './lib/nav'
import Shell from './components/Shell'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import OverviewDashboard from './pages/OverviewDashboard'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import ParentDashboard from './pages/ParentDashboard'
import PortalDashboard from './pages/PortalDashboard'
import Integrations from './pages/Integrations'
import Classes from './pages/Classes'
import Students from './pages/Students'
import ComingSoon from './pages/ComingSoon'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initializing } = useAuth()
  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading…
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireRole({ roles, children }: { roles?: string[]; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.isSuperAdmin) return <>{children}</>
  if (roles && !roles.some((r) => user.roles.includes(r))) {
    return <Navigate to={homeFor(user)} replace />
  }
  return <>{children}</>
}

function RoleHome() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homeFor(user)} replace />
}

function RedirectIfAuthed() {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated && user) return <Navigate to={homeFor(user)} replace />
  return <Login />
}

function RolePortal({ role }: { role: string }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <PortalDashboard role={role} user={user} />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const MODULE_PLACEHOLDERS = [
  '/students',
  '/staff',
  '/fees',
  '/classes',
  '/branches',
  '/attendance',
  '/exams',
  '/homework',
  '/notices',
  '/settings',
  '/tenants',
  '/subscriptions',
  '/audit',
  '/visitors',
  '/expenses',
  '/accounting',
  '/payroll',
  '/leave',
  '/library',
  '/transport',
  '/hostel',
  '/portal',
]

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<RedirectIfAuthed />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<RoleHome />} />
          <Route
            path="/owner"
            element={
              <RequireRole roles={['organization-owner']}>
                <OverviewDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/principal"
            element={
              <RequireRole roles={['principal']}>
                <OverviewDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole roles={['erp-superadmin']}>
                <SuperAdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/teacher"
            element={
              <RequireRole roles={['teacher']}>
                <TeacherDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/student"
            element={
              <RequireRole roles={['student']}>
                <StudentDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/parent"
            element={
              <RequireRole roles={['parent']}>
                <ParentDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/accountant"
            element={
              <RequireRole roles={['accountant']}>
                <RolePortal role="accountant" />
              </RequireRole>
            }
          />
          <Route
            path="/hr"
            element={
              <RequireRole roles={['hr']}>
                <RolePortal role="hr" />
              </RequireRole>
            }
          />
          <Route
            path="/reception"
            element={
              <RequireRole roles={['reception']}>
                <RolePortal role="reception" />
              </RequireRole>
            }
          />
          <Route
            path="/librarian"
            element={
              <RequireRole roles={['librarian']}>
                <RolePortal role="librarian" />
              </RequireRole>
            }
          />
          <Route
            path="/transport"
            element={
              <RequireRole roles={['transport-manager']}>
                <RolePortal role="transport" />
              </RequireRole>
            }
          />
          <Route
            path="/hostel"
            element={
              <RequireRole roles={['hostel-manager']}>
                <RolePortal role="hostel" />
              </RequireRole>
            }
          />
          <Route
            path="/integrations"
            element={
              <RequireRole roles={['organization-owner', 'principal']}>
                <Integrations />
              </RequireRole>
            }
          />
          <Route
            path="/classes"
            element={
              <RequireRole roles={['organization-owner', 'principal']}>
                <Classes />
              </RequireRole>
            }
          />
          <Route
            path="/students"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'teacher']}>
                <Students />
              </RequireRole>
            }
          />
          {MODULE_PLACEHOLDERS.map((path) => (
            <Route key={path} path={path} element={<ComingSoon />} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
