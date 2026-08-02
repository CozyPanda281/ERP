import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  FileText,
  ClipboardList,
  Megaphone,
  Building2,
  Settings,
  Landmark,
  ShieldCheck,
  CreditCard,
  ScrollText,
  Webhook,
  type LucideIcon,
} from 'lucide-react'
import type { AuthUser } from './types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const ROLE_LABELS: Record<string, string> = {
  'erp-superadmin': 'Super Admin',
  'organization-owner': 'Organization Owner',
  principal: 'Principal',
  reception: 'Reception',
  teacher: 'Teacher',
  accountant: 'Accountant',
  hr: 'HR',
  librarian: 'Librarian',
  'transport-manager': 'Transport Manager',
  'hostel-manager': 'Hostel Manager',
  parent: 'Parent',
  student: 'Student',
}

export function displayName(user: AuthUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

export function primaryRole(user: AuthUser): string {
  if (user.isSuperAdmin) return 'erp-superadmin'
  return user.roles[0] ?? ''
}

export function homeFor(user: AuthUser): string {
  if (user.isSuperAdmin) return '/admin'
  const role = primaryRole(user)
  if (role === 'organization-owner') return '/owner'
  if (role === 'principal') return '/principal'
  if (role === 'teacher') return '/teacher'
  if (role === 'student') return '/student'
  if (role === 'parent') return '/parent'
  if (role === 'accountant') return '/accountant'
  if (role === 'hr') return '/hr'
  if (role === 'reception') return '/reception'
  if (role === 'librarian') return '/librarian'
  if (role === 'transport-manager') return '/transport'
  if (role === 'hostel-manager') return '/hostel'
  return '/portal'
}

const TENANT_NAV: Record<string, NavItem[]> = {
  'organization-owner': [
    { to: '/owner', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'Students', icon: GraduationCap },
    { to: '/staff', label: 'Staff', icon: Users },
    { to: '/fees', label: 'Fees & Billing', icon: Landmark },
    { to: '/classes', label: 'Classes & Subjects', icon: BookOpen },
    { to: '/branches', label: 'Branches', icon: Building2 },
    { to: '/attendance', label: 'Attendance', icon: CalendarDays },
    { to: '/notices', label: 'Notices', icon: Megaphone },
    { to: '/integrations', label: 'API & Webhooks', icon: Webhook },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  principal: [
    { to: '/principal', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'Students', icon: GraduationCap },
    { to: '/staff', label: 'Staff', icon: Users },
    { to: '/attendance', label: 'Attendance', icon: CalendarDays },
    { to: '/exams', label: 'Exams & Results', icon: ClipboardList },
    { to: '/fees', label: 'Fees & Billing', icon: Landmark },
    { to: '/homework', label: 'Homework', icon: FileText },
    { to: '/notices', label: 'Notices', icon: Megaphone },
    { to: '/integrations', label: 'API & Webhooks', icon: Webhook },
  ],
  reception: [
    { to: '/reception', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'Admissions', icon: GraduationCap },
    { to: '/visitors', label: 'Visitors', icon: Users },
    { to: '/notices', label: 'Notices', icon: Megaphone },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendance', label: 'Attendance', icon: CalendarDays },
    { to: '/homework', label: 'Homework', icon: FileText },
    { to: '/exams', label: 'Exams & Results', icon: ClipboardList },
    { to: '/notices', label: 'Notices', icon: Megaphone },
  ],
  accountant: [
    { to: '/accountant', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/fees', label: 'Fees & Billing', icon: Landmark },
    { to: '/expenses', label: 'Expenses', icon: CreditCard },
    { to: '/accounting', label: 'Accounting', icon: ScrollText },
  ],
  hr: [
    { to: '/hr', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/staff', label: 'Staff', icon: Users },
    { to: '/payroll', label: 'Payroll', icon: Landmark },
    { to: '/leave', label: 'Leave', icon: CalendarDays },
  ],
  librarian: [
    { to: '/librarian', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/library', label: 'Library', icon: BookOpen },
  ],
  'transport-manager': [
    { to: '/transport', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transport', label: 'Transport', icon: CalendarDays },
  ],
  'hostel-manager': [
    { to: '/hostel', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/hostel', label: 'Hostel', icon: Building2 },
  ],
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendance', label: 'My Attendance', icon: CalendarDays },
    { to: '/exams', label: 'My Results', icon: ClipboardList },
    { to: '/homework', label: 'Homework', icon: FileText },
    { to: '/fees', label: 'My Fees', icon: Landmark },
  ],
  parent: [
    { to: '/parent', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendance', label: 'Attendance', icon: CalendarDays },
    { to: '/fees', label: 'Fees', icon: Landmark },
    { to: '/notices', label: 'Notices', icon: Megaphone },
  ],
}

const SUPER_ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Platform', icon: LayoutDashboard },
  { to: '/tenants', label: 'Tenants', icon: Building2 },
  { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/audit', label: 'Audit Logs', icon: ShieldCheck },
]

export function navFor(user: AuthUser): NavItem[] {
  if (user.isSuperAdmin) return SUPER_ADMIN_NAV
  return TENANT_NAV[primaryRole(user)] ?? TENANT_NAV.reception
}
