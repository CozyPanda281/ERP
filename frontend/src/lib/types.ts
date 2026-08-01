export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isSuperAdmin?: boolean
  roles: string[]
  permissions: string[]
  branchId: string | null
  tenantId?: string | null
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface FeeMonthlyPoint {
  month: string
  amount: number
}

export interface AttendanceDay {
  date: string
  total: number
  present: number
  absent: number
  rate: number | null
}

export interface OverviewData {
  asOf: string
  totals: {
    students: number
    staff: number
    classes: number
    sections: number
    subjects: number
    branches: number
    pendingApplications: number
    enquiries: number
    lowStockItems: number
    announcements: number
    homework: number
  }
  fees: {
    collectedThisMonth: number
    collectedTotal: number
    dueAmount: number
    dueAccounts: number
    monthlySeries: FeeMonthlyPoint[]
  }
  attendance: {
    today: AttendanceDay & { marked: boolean }
    weekly: AttendanceDay[]
  }
}

export interface TenantStats {
  total: number
  active: number
  trial: number
  suspended: number
  newLast30Days: number
}

export interface SubscriptionStats {
  activeCount: number
  trialCount: number
  expiredCount: number
  cancelledCount: number
  overdueCount: number
}
