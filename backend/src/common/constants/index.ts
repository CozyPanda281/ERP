export const TENANT_CONTEXT_KEY = 'tenant_context';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const SUBSCRIPTION_PLANS = {
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'erp-superadmin',
  ORGANIZATION_OWNER: 'organization-owner',
  PRINCIPAL: 'principal',
  RECEPTION: 'reception',
  TEACHER: 'teacher',
  ACCOUNTANT: 'accountant',
  HR: 'hr',
  LIBRARIAN: 'librarian',
  TRANSPORT_MANAGER: 'transport-manager',
  HOSTEL_MANAGER: 'hostel-manager',
  PARENT: 'parent',
  STUDENT: 'student',
} as const;

export const MODULES = {
  AUTH: 'auth',
  TENANTS: 'tenants',
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  BRANCHES: 'branches',
  ACADEMIC: 'academic',
  ADMISSIONS: 'admissions',
  STUDENTS: 'students',
  STAFF: 'staff',
  ATTENDANCE: 'attendance',
  FEES: 'fees',
  EXAMS: 'exams',
  TIMETABLE: 'timetable',
  HOMEWORK: 'homework',
  LIBRARY: 'library',
  TRANSPORT: 'transport',
  HOSTEL: 'hostel',
  COMMUNICATION: 'communication',
  INVENTORY: 'inventory',
  HR: 'hr',
  PAYROLL: 'payroll',
  SETTINGS: 'settings',
  DASHBOARD: 'dashboard',
} as const;
