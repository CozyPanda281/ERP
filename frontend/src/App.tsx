import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { homeFor, primaryRole, ROLE_LABELS } from './lib/nav'
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
import Fees from './pages/Fees'
import Attendance from './pages/Attendance'
import Notices from './pages/Notices'
import Staff from './pages/Staff'
import Branches from './pages/Branches'
import Settings from './pages/Settings'
import Exams from './pages/Exams'
import Homework from './pages/Homework'
import Expenses from './pages/Expenses'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import Library from './pages/Library'
import Transport from './pages/Transport'
import Hostel from './pages/Hostel'
import Visitors from './pages/Visitors'
import Accounting from './pages/Accounting'
import Tenants from './pages/Tenants'
import Subscriptions from './pages/Subscriptions'
import Audit from './pages/Audit'
import Appointments from './pages/Appointments'

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

function RolePortal({ role }: { role?: string }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const roleName = role ?? primaryRole(user)
  return <PortalDashboard role={ROLE_LABELS[roleName] ? roleName : 'reception'} user={user} />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

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
              <RequireRole roles={['organization-owner', 'principal', 'transport-manager']}>
                <Transport />
              </RequireRole>
            }
          />
          <Route
            path="/hostel"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'hostel-manager']}>
                <Hostel />
              </RequireRole>
            }
          />
          <Route
            path="/integrations"
            element={
              <RequireRole roles={['erp-superadmin']}>
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
          <Route
            path="/fees"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'accountant']}>
                <Fees />
              </RequireRole>
            }
          />
          <Route
            path="/attendance"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'teacher']}>
                <Attendance />
              </RequireRole>
            }
          />
          <Route
            path="/notices"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'teacher', 'student', 'parent']}>
                <Notices />
              </RequireRole>
            }
          />
          <Route
            path="/staff"
            element={
              <RequireRole roles={['organization-owner', 'principal']}>
                <Staff />
              </RequireRole>
            }
          />
          <Route
            path="/branches"
            element={
              <RequireRole roles={['organization-owner']}>
                <Branches />
              </RequireRole>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireRole roles={['organization-owner']}>
                <Settings />
              </RequireRole>
            }
          />
          <Route
            path="/exams"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'teacher']}>
                <Exams />
              </RequireRole>
            }
          />
          <Route
            path="/homework"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'teacher']}>
                <Homework />
              </RequireRole>
            }
          />
          <Route
            path="/expenses"
            element={
              <RequireRole roles={['organization-owner', 'accountant', 'principal']}>
                <Expenses />
              </RequireRole>
            }
          />
          <Route
            path="/leave"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'hr']}>
                <Leave />
              </RequireRole>
            }
          />
          <Route
            path="/payroll"
            element={
              <RequireRole roles={['organization-owner', 'accountant', 'principal', 'hr']}>
                <Payroll />
              </RequireRole>
            }
          />
          <Route
            path="/library"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'librarian']}>
                <Library />
              </RequireRole>
            }
          />
          <Route
            path="/visitors"
            element={
              <RequireRole roles={['organization-owner', 'principal', 'reception']}>
                <Visitors />
              </RequireRole>
            }
          />
          <Route
            path="/accounting"
            element={
              <RequireRole roles={['organization-owner', 'accountant', 'principal']}>
                <Accounting />
              </RequireRole>
            }
          />
          <Route
            path="/tenants"
            element={
              <RequireRole roles={['erp-superadmin']}>
                <Tenants />
              </RequireRole>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <RequireRole roles={['erp-superadmin']}>
                <Subscriptions />
              </RequireRole>
            }
          />
          <Route
            path="/audit"
            element={
              <RequireRole roles={['erp-superadmin']}>
                <Audit />
              </RequireRole>
            }
          />
          <Route
            path="/appointments"
            element={
              <RequireRole
                roles={[
                  'organization-owner',
                  'principal',
                  'reception',
                  'teacher',
                  'accountant',
                  'hr',
                  'librarian',
                  'transport-manager',
                  'hostel-manager',
                  'parent',
                ]}
              >
                <Appointments />
              </RequireRole>
            }
          />
          <Route
            path="/portal"
            element={<RolePortal />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
