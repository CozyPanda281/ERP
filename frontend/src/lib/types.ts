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

export interface UnlinkedResponse {
  linked: false
  message: string
}

export interface TeacherClass {
  classId: string
  className: string
  sectionId: string | null
  sectionName: string | null
  subjectId: string
  subjectName: string
  isClassTeacher: boolean
}

export interface TeacherPeriod {
  startTime: string
  endTime: string
  subjectName: string
  className: string
  sectionName: string | null
  roomNumber: string | null
}

export interface TeacherHomeworkItem {
  id: string
  title: string
  dueDate: string
  className: string
  subjectName: string
}

export interface TeacherExam {
  id: string
  examName: string
  date: string | null
  startTime: string | null
  subjectName: string
  maxMarks: number | null
  roomNumber: string | null
}

export interface TeacherOverview {
  linked: true
  staff: { firstName: string; lastName: string; designation: string | null; employeeCode: string }
  myClasses: TeacherClass[]
  todayPeriods: TeacherPeriod[]
  homework: { open: number; recent: TeacherHomeworkItem[] }
  submissions: { pendingGrading: number }
  todayAttendance: {
    sessions: number
    total: number
    present: number
    absent: number
    rate: number | null
  }
  upcomingExams: TeacherExam[]
}

export interface StudentOverview {
  linked: true
  student: {
    firstName: string
    lastName: string
    admissionNumber: string
    rollNumber: string | null
  }
  enrollment: { className: string; sectionName: string | null; academicYear: string } | null
  attendance: { daysRecorded: number; present: number; absent: number; excused: number; rate: number | null }
  fees: {
    account: { totalFee: number; totalPaid: number; totalDue: number; status: string } | null
    recentPayments: Array<{
      transactionNo: string
      amount: number
      paymentMethod: string | null
      status: string
      paymentDate: string
    }>
  }
  results: Array<{
    subjectName: string
    marksObtained: number | null
    maxMarks: number | null
    grade: string | null
    isAbsent: boolean
    examName: string
    date: string | null
  }>
  homework: { open: number; dueSoon: Array<{ id: string; title: string; dueDate: string; subjectName: string }> }
}

export interface ParentChild {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string
  className: string | null
  sectionName: string | null
  attendance: { daysRecorded: number; present: number; absent: number; rate: number | null }
  fees: { totalDue: number; totalPaid: number }
}

export interface ParentOverview {
  linked: true
  parentName: string
  children: ParentChild[]
  totals: { children: number; totalDue: number; totalPaid: number }
}

export interface PaymentRow {
  id: string
  transactionNo: string
  amount: string | number
  paymentMethod: string | null
  paidDate: string | null
  firstName: string
  lastName: string
  admissionNumber: string
}

export interface AccountantOverview {
  asOf: string
  fees: {
    collectedToday: number
    collectedThisMonth: number
    collectedTotal: number
    pendingInvoices: number
    overdueInvoices: number
    dueAccounts: number
    dueAmount: number
  }
  expenses: { thisMonth: number }
  income: { thisMonth: number }
  net: { thisMonth: number }
  recentPayments: PaymentRow[]
}

export interface HrOverview {
  asOf: string
  staff: {
    total: number
    active: number
    teaching: number
    inactive: number
    joiningThisMonth: number
  }
  leave: { pendingRequests: number; approvedThisMonth: number }
  recruitment: { openPostings: number; applications: number }
}

export interface VisitorRow {
  id: string
  name: string
  purpose: string
  personToMeet: string | null
  status: string
  checkInTime: string
}

export interface ReceptionOverview {
  asOf: string
  visitors: { today: number; checkedInNow: number }
  admissions: {
    newEnquiries: number
    totalEnquiries: number
    pendingApplications: number
    applicationsToday: number
  }
  announcements: { active: number; circulars: number }
  recentVisitors: VisitorRow[]
}

export interface IssueRow {
  id: string
  status: string
  dueDate: string | null
  bookTitle: string
  bookIsbn: string | null
  memberId: string
  memberType: string
}

export interface LibrarianOverview {
  asOf: string
  books: { total: number; available: number }
  members: { active: number }
  issues: { active: number; overdue: number; dueToday: number }
  recentIssues: IssueRow[]
}

export interface FuelLogRow {
  id: string
  fuelDate: string | null
  quantityLiters: string | number | null
  totalCost: string | number | null
  vehicleNumber: string
}

export interface TransportOverview {
  asOf: string
  vehicles: { total: number; active: number; inactive: number }
  routes: { active: number }
  assignments: { active: number }
  fuel: { costThisMonth: number; recent: FuelLogRow[] }
  maintenance: { dueNow: number }
}

export interface AllocationRow {
  id: string
  studentId: string
  status: string
  roomNumber: string
  hostelName: string
  studentName: string
}

export interface HostelOverview {
  asOf: string
  hostels: { active: number }
  rooms: { total: number; available: number; occupied: number; occupancyRate: number }
  allocations: { active: number; recent: AllocationRow[] }
  attendance: { today: number; present: number; absent: number }
}
