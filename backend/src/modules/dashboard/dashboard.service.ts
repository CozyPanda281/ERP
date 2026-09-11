import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  sum,
} from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

interface OverviewParams {
  tenantId: string;
  branchId?: string | null;
}

interface ScopedTable {
  tenantId: SQL;
  branchId?: SQL;
}

function dateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseProvider) {}

  private scoped(
    table: ScopedTable,
    tenantId: string,
    branchId?: string | null,
  ) {
    const conds: SQL[] = [eq(table.tenantId, tenantId)];
    if (branchId && table.branchId) conds.push(eq(table.branchId, branchId));
    return conds;
  }

  async overview({ tenantId, branchId }: OverviewParams) {
    const t = tenantId;
    const branch = branchId;

    const countScoped = (table: ScopedTable, extra: SQL[] = []) =>
      this.db.db
        .select({ value: count() })
        .from(table as any)
        .where(and(...this.scoped(table, t, branch), ...extra))
        .then((rows) => Number(rows[0]?.value ?? 0));

    const [
      students,
      staff,
      classes,
      sections,
      subjects,
      branches,
      pendingApplications,
      enquiries,
      lowStockItems,
      announcements,
      homework,
      feeThisMonth,
      feeTotal,
      due,
      dueAccounts,
      attendanceToday,
      feeMonthly,
      attendanceWeekly,
    ] = await Promise.all([
      countScoped(schema.students as any, [
        eq((schema.students as any).isActive, true),
      ]),
      countScoped(schema.staff as any, [
        eq((schema.staff as any).isActive, true),
      ]),
      countScoped(schema.classes as any, [
        eq((schema.classes as any).isActive, true),
      ]),
      countScoped(schema.sections as any),
      countScoped(schema.subjects as any),
      countScoped(schema.branches as any),
      countScoped(schema.applications as any, [
        eq((schema.applications as any).status, 'pending'),
      ]),
      countScoped(schema.enquiries as any),
      this.db.db
        .select({ value: count() })
        .from(schema.inventoryItems)
        .where(
          and(
            ...this.scoped(schema.inventoryItems as any, t, branch),
            eq(schema.inventoryItems.isActive, true),
            sql`${schema.inventoryItems.currentStock} <= ${schema.inventoryItems.reorderLevel}`,
          ),
        )
        .then((rows) => Number(rows[0]?.value ?? 0)),
      countScoped(schema.announcements as any),
      countScoped(schema.homework as any),
      this.sumFee(t, branch, undefined, 'month'),
      this.sumFee(t, branch, undefined, 'all'),
      this.db.db
        .select({ value: sum(schema.studentFeeAccounts.totalDue) })
        .from(schema.studentFeeAccounts)
        .where(
          and(
            ...this.scoped(schema.studentFeeAccounts as any, t, branch),
            eq(schema.studentFeeAccounts.status, 'active'),
          ),
        )
        .then((rows) => Number(rows[0]?.value ?? 0)),
      countScoped(schema.studentFeeAccounts as any, [
        eq((schema.studentFeeAccounts as any).status, 'active'),
        sql`${(schema.studentFeeAccounts as any).totalDue} > 0`,
      ]),
      this.attendanceToday(t, branch),
      this.feeMonthlySeries(t, branch),
      this.attendanceWeekly(t, branch),
    ]);

    return {
      asOf: dateStr(new Date()),
      totals: {
        students,
        staff,
        classes,
        sections,
        subjects,
        branches,
        pendingApplications,
        enquiries,
        lowStockItems,
        announcements,
        homework,
      },
      fees: {
        collectedThisMonth: feeThisMonth,
        collectedTotal: feeTotal,
        dueAmount: due,
        dueAccounts,
        monthlySeries: feeMonthly,
      },
      attendance: {
        today: attendanceToday,
        weekly: attendanceWeekly,
      },
    };
  }

  private async sumFee(
    tenantId: string,
    branchId: string | null | undefined,
    _feeAccountId?: string,
    range: 'month' | 'all' = 'all',
  ) {
    const t = tenantId;
    const conditions: SQL[] = [
      eq(schema.feeTransactions.tenantId, t),
      eq(schema.feeTransactions.status, 'completed'),
      ...(branchId ? [eq(schema.feeTransactions.branchId, branchId)] : []),
    ];
    if (range === 'month') {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(schema.feeTransactions.paymentDate, start));
    }
    const rows = await this.db.db
      .select({ value: sum(schema.feeTransactions.amount) })
      .from(schema.feeTransactions)
      .where(and(...conditions));
    return Number(rows[0]?.value ?? 0);
  }

  private async feeMonthlySeries(tenantId: string, branchId?: string | null) {
    const start = new Date();
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const monthCol = sql<string>`to_char(${schema.feeTransactions.paymentDate}, 'YYYY-MM')`;
    const rows = await this.db.db
      .select({ month: monthCol, amount: sum(schema.feeTransactions.amount) })
      .from(schema.feeTransactions)
      .where(
        and(
          eq(schema.feeTransactions.tenantId, tenantId),
          eq(schema.feeTransactions.status, 'completed'),
          gte(schema.feeTransactions.paymentDate, start),
          ...(branchId ? [eq(schema.feeTransactions.branchId, branchId)] : []),
        ),
      )
      .groupBy(monthCol)
      .orderBy(monthCol);

    const byMonth = new Map(
      rows.map((r) => [String(r.month), Number(r.amount ?? 0)]),
    );
    const series: Array<{ month: string; amount: number }> = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 6; i++) {
      const key = monthKey(cursor);
      series.push({ month: key, amount: byMonth.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return series.reverse();
  }

  private async attendanceToday(tenantId: string, branchId?: string | null) {
    const todayStr = dateStr(new Date());
    const rows = await this.db.db
      .select({
        total: sum(schema.attendance.totalStudents),
        present: sum(schema.attendance.totalPresent),
        absent: sum(schema.attendance.totalAbsent),
      })
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.tenantId, tenantId),
          eq(schema.attendance.date, todayStr),
          ...(branchId ? [eq(schema.attendance.branchId, branchId)] : []),
        ),
      );
    const row = rows[0];
    const total = Number(row?.total ?? 0);
    const present = Number(row?.present ?? 0);
    const absent = Number(row?.absent ?? 0);
    return {
      date: todayStr,
      total,
      present,
      absent,
      marked: total > 0,
      rate: total > 0 ? Math.round((present / total) * 100) : null,
    };
  }

  private async attendanceWeekly(tenantId: string, branchId?: string | null) {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const startStr = dateStr(start);

    const rows = await this.db.db
      .select({
        date: schema.attendance.date,
        total: sum(schema.attendance.totalStudents),
        present: sum(schema.attendance.totalPresent),
        absent: sum(schema.attendance.totalAbsent),
      })
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.tenantId, tenantId),
          gte(schema.attendance.date, startStr),
          ...(branchId ? [eq(schema.attendance.branchId, branchId)] : []),
        ),
      )
      .groupBy(schema.attendance.date)
      .orderBy(schema.attendance.date);

    const byDate = new Map(rows.map((r) => [String(r.date), r]));
    const series: Array<{
      date: string;
      total: number;
      present: number;
      absent: number;
      rate: number | null;
    }> = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      const key = dateStr(day);
      const row = byDate.get(key);
      const total = Number(row?.total ?? 0);
      const present = Number(row?.present ?? 0);
      const absent = Number(row?.absent ?? 0);
      series.push({
        date: key,
        total,
        present,
        absent,
        rate: total > 0 ? Math.round((present / total) * 100) : null,
      });
    }
    return series;
  }

  // ─── Teacher Portal ─────────────────────────────────────────────────────

  async teacherOverview(params: {
    tenantId: string;
    branchId?: string | null;
    userId: string;
  }) {
    const t = params.tenantId;
    const branch = params.branchId;

    const [staff] = await this.db.db
      .select({
        id: schema.staff.id,
        firstName: schema.staff.firstName,
        lastName: schema.staff.lastName,
        designation: schema.staff.designation,
        employeeCode: schema.staff.employeeCode,
        isTeaching: schema.staff.isTeaching,
      })
      .from(schema.staff)
      .where(
        and(
          eq(schema.staff.tenantId, t),
          eq(schema.staff.userId, params.userId),
          eq(schema.staff.isActive, true),
        ),
      )
      .limit(1);

    if (!staff) {
      return {
        linked: false,
        message: 'No staff record is linked to this account.',
      };
    }

    const [
      myClasses,
      todayPeriods,
      homeworkOpen,
      submissionsPending,
      todayAttendance,
      upcomingExams,
    ] = await Promise.all([
      this.teacherClasses(t, staff.id),
      this.teacherTodayPeriods(t, staff.id),
      this.teacherHomeworkOpen(t, staff.id, branch),
      this.teacherSubmissionsPending(t, staff.id, branch),
      this.teacherTodayAttendance(t, staff.id, branch),
      this.teacherUpcomingExams(t, staff.id, branch),
    ]);

    return {
      linked: true,
      staff: {
        firstName: staff.firstName,
        lastName: staff.lastName,
        designation: staff.designation ?? null,
        employeeCode: staff.employeeCode,
      },
      myClasses,
      todayPeriods,
      homework: { open: homeworkOpen.open, recent: homeworkOpen.recent },
      submissions: submissionsPending,
      todayAttendance,
      upcomingExams,
    };
  }

  private async teacherClasses(tenantId: string, staffId: string) {
    const rows = await this.db.db
      .select({
        classId: schema.teacherSubjects.classId,
        className: schema.classes.name,
        sectionId: schema.teacherSubjects.sectionId,
        sectionName: schema.sections.name,
        subjectId: schema.teacherSubjects.subjectId,
        subjectName: schema.subjects.name,
        isClassTeacher: schema.teacherSubjects.isClassTeacher,
      })
      .from(schema.teacherSubjects)
      .innerJoin(
        schema.classes,
        eq(schema.classes.id, schema.teacherSubjects.classId),
      )
      .innerJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.teacherSubjects.subjectId),
      )
      .leftJoin(
        schema.sections,
        eq(schema.sections.id, schema.teacherSubjects.sectionId),
      )
      .where(eq(schema.teacherSubjects.teacherId, staffId));

    const seen = new Set<string>();
    return rows
      .filter((r) => {
        const key = `${r.classId}-${r.sectionId ?? ''}-${r.subjectId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((r) => ({
        classId: r.classId,
        className: r.className,
        sectionId: r.sectionId,
        sectionName: r.sectionName ?? null,
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        isClassTeacher: r.isClassTeacher,
      }));
  }

  private async teacherTodayPeriods(tenantId: string, staffId: string) {
    const todayIdx = new Date().getDay();
    const rows = await this.db.db
      .select({
        startTime: schema.timetableEntries.startTime,
        endTime: schema.timetableEntries.endTime,
        subjectName: schema.subjects.name,
        className: schema.classes.name,
        sectionName: schema.sections.name,
        roomNumber: schema.timetableEntries.roomNumber,
      })
      .from(schema.timetableEntries)
      .innerJoin(
        schema.timetables,
        eq(schema.timetables.id, schema.timetableEntries.timetableId),
      )
      .innerJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.timetableEntries.subjectId),
      )
      .innerJoin(
        schema.classes,
        eq(schema.classes.id, schema.timetables.classId),
      )
      .leftJoin(
        schema.sections,
        eq(schema.sections.id, schema.timetables.sectionId),
      )
      .where(
        and(
          eq(schema.timetables.tenantId, tenantId),
          eq(schema.timetableEntries.teacherId, staffId),
          eq(schema.timetableEntries.dayOfWeek, todayIdx),
          eq(schema.timetables.isActive, true),
          eq(schema.timetableEntries.isBreak, false),
        ),
      )
      .orderBy(schema.timetableEntries.startTime);
    return rows.map((r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
      subjectName: r.subjectName,
      className: r.className,
      sectionName: r.sectionName ?? null,
      roomNumber: r.roomNumber ?? null,
    }));
  }

  private async teacherHomeworkOpen(
    tenantId: string,
    staffId: string,
    branchId?: string | null,
  ) {
    const conds: SQL[] = [
      eq(schema.homework.tenantId, tenantId),
      eq(schema.homework.teacherId, staffId),
      eq(schema.homework.status, 'active'),
    ];
    if (branchId) conds.push(eq(schema.homework.branchId, branchId));

    const open = await this.db.db
      .select({ value: count() })
      .from(schema.homework)
      .where(and(...conds))
      .then((rows) => Number(rows[0]?.value ?? 0));

    const recent = await this.db.db
      .select({
        id: schema.homework.id,
        title: schema.homework.title,
        dueDate: schema.homework.dueDate,
        className: schema.classes.name,
        subjectName: schema.subjects.name,
      })
      .from(schema.homework)
      .innerJoin(schema.classes, eq(schema.classes.id, schema.homework.classId))
      .innerJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.homework.subjectId),
      )
      .where(and(...conds))
      .orderBy(sql`${schema.homework.dueDate} ASC`)
      .limit(5);

    return { open, recent };
  }

  private async teacherSubmissionsPending(
    tenantId: string,
    staffId: string,
    branchId?: string | null,
  ) {
    const conds: SQL[] = [
      eq(schema.homework.tenantId, tenantId),
      eq(schema.homework.teacherId, staffId),
      eq(schema.homeworkSubmissions.status, 'submitted'),
    ];
    if (branchId) conds.push(eq(schema.homework.branchId, branchId));

    const result = await this.db.db
      .select({ value: count() })
      .from(schema.homeworkSubmissions)
      .innerJoin(
        schema.homework,
        eq(schema.homework.id, schema.homeworkSubmissions.homeworkId),
      )
      .where(
        and(...conds, sql`${schema.homeworkSubmissions.gradedAt} IS NULL`),
      );
    return { pendingGrading: Number(result[0]?.value ?? 0) };
  }

  private async teacherTodayAttendance(
    tenantId: string,
    staffId: string,
    branchId?: string | null,
  ) {
    const todayStr = dateStr(new Date());
    const conds: SQL[] = [
      eq(schema.attendance.tenantId, tenantId),
      eq(schema.attendance.teacherId, staffId),
      eq(schema.attendance.date, todayStr),
    ];
    if (branchId) conds.push(eq(schema.attendance.branchId, branchId));

    const rows = await this.db.db
      .select({
        sessions: count(),
        total: sum(schema.attendance.totalStudents),
        present: sum(schema.attendance.totalPresent),
        absent: sum(schema.attendance.totalAbsent),
      })
      .from(schema.attendance)
      .where(and(...conds));

    const total = Number(rows[0]?.total ?? 0);
    const present = Number(rows[0]?.present ?? 0);
    const absent = Number(rows[0]?.absent ?? 0);
    return {
      sessions: Number(rows[0]?.sessions ?? 0),
      total,
      present,
      absent,
      rate: total > 0 ? Math.round((present / total) * 100) : null,
    };
  }

  private async teacherUpcomingExams(
    tenantId: string,
    staffId: string,
    branchId?: string | null,
  ) {
    const todayStr = dateStr(new Date());
    const classIds = await this.db.db
      .selectDistinct({ id: schema.teacherSubjects.classId })
      .from(schema.teacherSubjects)
      .where(eq(schema.teacherSubjects.teacherId, staffId));

    if (!classIds.length) return [];

    const rows = await this.db.db
      .select({
        id: schema.examSchedules.id,
        examName: schema.exams.name,
        date: schema.examSchedules.date,
        startTime: schema.examSchedules.startTime,
        subjectName: schema.subjects.name,
        maxMarks: schema.examSchedules.maxMarks,
        roomNumber: schema.examSchedules.roomNumber,
      })
      .from(schema.examSchedules)
      .innerJoin(schema.exams, eq(schema.exams.id, schema.examSchedules.examId))
      .innerJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.examSchedules.subjectId),
      )
      .where(
        and(
          eq(schema.exams.tenantId, tenantId),
          inArray(
            schema.examSchedules.classId,
            classIds.map((c) => c.id),
          ),
          gte(schema.examSchedules.date, todayStr),
          ...(branchId ? [eq(schema.exams.branchId, branchId)] : []),
        ),
      )
      .orderBy(sql`${schema.examSchedules.date} ASC`)
      .limit(5);

    return rows;
  }

  // ─── Student Portal ─────────────────────────────────────────────────────

  async studentOverview(params: {
    tenantId: string;
    branchId?: string | null;
    userId: string;
    email: string;
  }) {
    const t = params.tenantId;

    const [student] = await this.db.db
      .select({
        id: schema.students.id,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        admissionNumber: schema.students.admissionNumber,
        rollNumber: schema.students.rollNumber,
      })
      .from(schema.students)
      .where(
        and(
          eq(schema.students.tenantId, t),
          sql`LOWER(${schema.students.email}) = ${params.email.toLowerCase()}`,
          eq(schema.students.isActive, true),
          isNull(schema.students.deletedAt),
        ),
      )
      .orderBy(schema.students.createdAt)
      .limit(1);

    if (!student) {
      return {
        linked: false,
        message: 'No student record is linked to this account.',
      };
    }

    const [enrollment, attendance, fees, results, homework] = await Promise.all(
      [
        this.studentEnrollment(t, student.id),
        this.studentAttendance(t, student.id, params.branchId),
        this.studentFees(t, student.id),
        this.studentResults(t, student.id),
        this.studentHomework(t, student.id),
      ],
    );

    return {
      linked: true,
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber,
      },
      enrollment,
      attendance,
      fees,
      results,
      homework,
    };
  }

  private async studentEnrollment(tenantId: string, studentId: string) {
    const rows = await this.db.db
      .select({
        className: schema.classes.name,
        sectionName: schema.sections.name,
        academicYearName: schema.academicYears.name,
      })
      .from(schema.studentAcademicRecords)
      .innerJoin(
        schema.classes,
        eq(schema.classes.id, schema.studentAcademicRecords.classId),
      )
      .leftJoin(
        schema.sections,
        eq(schema.sections.id, schema.studentAcademicRecords.sectionId),
      )
      .innerJoin(
        schema.academicYears,
        eq(
          schema.academicYears.id,
          schema.studentAcademicRecords.academicYearId,
        ),
      )
      .where(eq(schema.studentAcademicRecords.studentId, studentId))
      .orderBy(sql`${schema.studentAcademicRecords.createdAt} DESC`)
      .limit(1);

    return rows[0]
      ? {
          className: rows[0].className,
          sectionName: rows[0].sectionName ?? null,
          academicYear: rows[0].academicYearName,
        }
      : null;
  }

  private async studentAttendance(
    tenantId: string,
    studentId: string,
    branchId?: string | null,
  ) {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const rows = await this.db.db
      .select({
        date: schema.attendance.date,
        status: schema.attendanceRecords.status,
      })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.attendance,
        eq(schema.attendance.id, schema.attendanceRecords.attendanceId),
      )
      .where(
        and(
          eq(schema.attendance.tenantId, tenantId),
          eq(schema.attendanceRecords.studentId, studentId),
          gte(schema.attendance.date, dateStr(since)),
          ...(branchId ? [eq(schema.attendance.branchId, branchId)] : []),
        ),
      );

    let present = 0;
    let absent = 0;
    let excused = 0;
    for (const r of rows) {
      if (r.status === 'present' || r.status === 'late') present++;
      else if (r.status === 'excused') excused++;
      else absent++;
    }

    return {
      daysRecorded: rows.length,
      present,
      absent,
      excused,
      rate: rows.length > 0 ? Math.round((present / rows.length) * 100) : null,
    };
  }

  private async studentFees(tenantId: string, studentId: string) {
    const [account] = await this.db.db
      .select({
        totalFee: schema.studentFeeAccounts.totalFee,
        totalPaid: schema.studentFeeAccounts.totalPaid,
        totalDue: schema.studentFeeAccounts.totalDue,
        status: schema.studentFeeAccounts.status,
      })
      .from(schema.studentFeeAccounts)
      .where(
        and(
          eq(schema.studentFeeAccounts.tenantId, tenantId),
          eq(schema.studentFeeAccounts.studentId, studentId),
        ),
      )
      .limit(1);

    const recent = await this.db.db
      .select({
        transactionNo: schema.feeTransactions.transactionNo,
        amount: schema.feeTransactions.amount,
        paymentMethod: schema.feeTransactions.paymentMethod,
        status: schema.feeTransactions.status,
        paymentDate: schema.feeTransactions.paymentDate,
      })
      .from(schema.feeTransactions)
      .where(
        and(
          eq(schema.feeTransactions.tenantId, tenantId),
          eq(schema.feeTransactions.studentId, studentId),
        ),
      )
      .orderBy(sql`${schema.feeTransactions.paymentDate} DESC`)
      .limit(5);

    return {
      account: account
        ? {
            totalFee: Number(account.totalFee ?? 0),
            totalPaid: Number(account.totalPaid ?? 0),
            totalDue: Number(account.totalDue ?? 0),
            status: account.status,
          }
        : null,
      recentPayments: recent.map((r) => ({
        transactionNo: r.transactionNo,
        amount: Number(r.amount ?? 0),
        paymentMethod: r.paymentMethod,
        status: r.status,
        paymentDate: r.paymentDate,
      })),
    };
  }

  private async studentResults(tenantId: string, studentId: string) {
    const rows = await this.db.db
      .select({
        subjectName: schema.subjects.name,
        marksObtained: schema.marks.marksObtained,
        maxMarks: schema.marks.maxMarks,
        grade: schema.marks.grade,
        isAbsent: schema.marks.isAbsent,
        examName: schema.exams.name,
        date: schema.examSchedules.date,
      })
      .from(schema.marks)
      .innerJoin(
        schema.examSchedules,
        eq(schema.examSchedules.id, schema.marks.examScheduleId),
      )
      .innerJoin(schema.exams, eq(schema.exams.id, schema.examSchedules.examId))
      .innerJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.examSchedules.subjectId),
      )
      .where(
        and(
          eq(schema.marks.tenantId, tenantId),
          eq(schema.marks.studentId, studentId),
        ),
      )
      .orderBy(sql`${schema.examSchedules.date} DESC`)
      .limit(10);

    return rows.map((r) => ({
      subjectName: r.subjectName,
      marksObtained: r.marksObtained ? Number(r.marksObtained) : null,
      maxMarks: r.maxMarks ?? null,
      grade: r.grade ?? null,
      isAbsent: r.isAbsent,
      examName: r.examName,
      date: r.date,
    }));
  }

  private async studentHomework(tenantId: string, studentId: string) {
    const [record] = await this.db.db
      .select({
        classId: schema.studentAcademicRecords.classId,
        sectionId: schema.studentAcademicRecords.sectionId,
      })
      .from(schema.studentAcademicRecords)
      .where(eq(schema.studentAcademicRecords.studentId, studentId))
      .orderBy(sql`${schema.studentAcademicRecords.createdAt} DESC`)
      .limit(1);

    if (!record) return { open: 0, dueSoon: [] };

    const conds: SQL[] = [
      eq(schema.homework.tenantId, tenantId),
      eq(schema.homework.classId, record.classId),
      eq(schema.homework.status, 'active'),
      ...(record.sectionId
        ? [
            or(
              isNull(schema.homework.sectionId),
              eq(schema.homework.sectionId, record.sectionId),
            ) as SQL,
          ]
        : [isNull(schema.homework.sectionId)]),
    ];

    const open = await this.db.db
      .select({ value: count() })
      .from(schema.homework)
      .where(and(...conds))
      .then((rows) => Number(rows[0]?.value ?? 0));

    const dueSoon = await this.db.db
      .select({
        id: schema.homework.id,
        title: schema.homework.title,
        dueDate: schema.homework.dueDate,
        subjectName: schema.subjects.name,
      })
      .from(schema.homework)
      .innerJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.homework.subjectId),
      )
      .where(and(...conds, gte(schema.homework.dueDate, new Date())))
      .orderBy(sql`${schema.homework.dueDate} ASC`)
      .limit(5);

    return {
      open,
      dueSoon: dueSoon.map((r) => ({
        id: r.id,
        title: r.title,
        dueDate: r.dueDate,
        subjectName: r.subjectName,
      })),
    };
  }

  // ─── Parent Portal ──────────────────────────────────────────────────────

  async parentOverview(params: {
    tenantId: string;
    branchId?: string | null;
    email: string;
  }) {
    const t = params.tenantId;

    const [parent] = await this.db.db
      .select({ id: schema.parents.id, name: schema.parents.name })
      .from(schema.parents)
      .where(
        and(
          eq(schema.parents.tenantId, t),
          sql`LOWER(${schema.parents.email}) = ${params.email.toLowerCase()}`,
          eq(schema.parents.isActive, true),
        ),
      )
      .limit(1);

    if (!parent) {
      return {
        linked: false,
        message: 'No parent record is linked to this account.',
      };
    }

    const studentIds = await this.db.db
      .select({ id: schema.students.id })
      .from(schema.studentParents)
      .innerJoin(
        schema.students,
        eq(schema.students.id, schema.studentParents.studentId),
      )
      .where(
        and(
          eq(schema.studentParents.parentId, parent.id),
          eq(schema.students.isActive, true),
          isNull(schema.students.deletedAt),
        ),
      );

    if (!studentIds.length) {
      return { linked: true, children: [] };
    }

    const ids = studentIds.map((s) => s.id);

    const [students, attendanceByStudent, feesByStudent] = await Promise.all([
      this.parentChildren(t, ids),
      this.parentChildrenAttendance(t, ids),
      this.parentChildrenFees(t, ids),
    ]);

    const children = students.map((s) => {
      const att = attendanceByStudent.get(s.id);
      const fee = feesByStudent.get(s.id);
      return {
        ...s,
        attendance: att ?? {
          daysRecorded: 0,
          present: 0,
          absent: 0,
          rate: null,
        },
        fees: fee ?? { totalDue: 0, totalPaid: 0 },
      };
    });

    return {
      linked: true,
      parentName: parent.name,
      children,
      totals: {
        children: children.length,
        totalDue: children.reduce((acc, c) => acc + c.fees.totalDue, 0),
        totalPaid: children.reduce((acc, c) => acc + c.fees.totalPaid, 0),
      },
    };
  }

  private async parentChildren(tenantId: string, studentIds: string[]) {
    const rows = await this.db.db
      .select({
        id: schema.students.id,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        admissionNumber: schema.students.admissionNumber,
        className: schema.classes.name,
        sectionName: schema.sections.name,
      })
      .from(schema.students)
      .leftJoin(
        schema.studentAcademicRecords,
        eq(schema.studentAcademicRecords.studentId, schema.students.id),
      )
      .leftJoin(
        schema.classes,
        eq(schema.classes.id, schema.studentAcademicRecords.classId),
      )
      .leftJoin(
        schema.sections,
        eq(schema.sections.id, schema.studentAcademicRecords.sectionId),
      )
      .where(
        and(
          eq(schema.students.tenantId, tenantId),
          inArray(schema.students.id, studentIds),
        ),
      );

    const latest: Record<string, any> = {};
    for (const r of rows) {
      const existing = latest[r.id];
      if (!existing || (existing.className ?? null) === null) {
        latest[r.id] = r;
      }
    }
    return Object.values(latest).map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      admissionNumber: r.admissionNumber,
      className: r.className ?? null,
      sectionName: r.sectionName ?? null,
    }));
  }

  private async parentChildrenAttendance(
    tenantId: string,
    studentIds: string[],
  ) {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const rows = await this.db.db
      .select({
        studentId: schema.attendanceRecords.studentId,
        status: schema.attendanceRecords.status,
      })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.attendance,
        eq(schema.attendance.id, schema.attendanceRecords.attendanceId),
      )
      .where(
        and(
          eq(schema.attendance.tenantId, tenantId),
          inArray(schema.attendanceRecords.studentId, studentIds),
          gte(schema.attendance.date, dateStr(since)),
        ),
      );

    const byStudent = new Map<
      string,
      { daysRecorded: number; present: number; absent: number }
    >();
    for (const r of rows) {
      const entry = byStudent.get(r.studentId) ?? {
        daysRecorded: 0,
        present: 0,
        absent: 0,
      };
      entry.daysRecorded++;
      if (r.status === 'present' || r.status === 'late') entry.present++;
      else entry.absent++;
      byStudent.set(r.studentId, entry);
    }

    return new Map(
      [...byStudent.entries()].map(([id, v]) => [
        id,
        {
          ...v,
          rate:
            v.daysRecorded > 0
              ? Math.round((v.present / v.daysRecorded) * 100)
              : null,
        },
      ]),
    );
  }

  private async parentChildrenFees(tenantId: string, studentIds: string[]) {
    const rows = await this.db.db
      .select({
        studentId: schema.studentFeeAccounts.studentId,
        totalDue: schema.studentFeeAccounts.totalDue,
        totalPaid: schema.studentFeeAccounts.totalPaid,
      })
      .from(schema.studentFeeAccounts)
      .where(
        and(
          eq(schema.studentFeeAccounts.tenantId, tenantId),
          inArray(schema.studentFeeAccounts.studentId, studentIds),
        ),
      );

    return new Map(
      rows.map((r) => [
        r.studentId,
        {
          totalDue: Number(r.totalDue ?? 0),
          totalPaid: Number(r.totalPaid ?? 0),
        },
      ]),
    );
  }

  async accountantOverview(params: {
    tenantId: string;
    branchId?: string | null;
  }) {
    const { tenantId: t, branchId: branch } = params;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const txnConditions = (from?: Date, to?: Date): any[] => {
      const conds: any[] = [
        eq(schema.feeTransactions.tenantId, t),
        eq(schema.feeTransactions.status, 'completed'),
      ];
      if (branch) conds.push(eq(schema.feeTransactions.branchId, branch));
      if (from) conds.push(gte(schema.feeTransactions.paymentDate, from));
      if (to) conds.push(lte(schema.feeTransactions.paymentDate, to));
      return conds;
    };

    const sumOf = (rows: { value: string | number | null }[]) =>
      Number(rows[0]?.value ?? 0);

    const [
      collectedToday,
      collectedThisMonth,
      collectedTotal,
      expensesThisMonth,
      incomeThisMonth,
      pendingInvoices,
      overdueInvoices,
      dueAccounts,
      dueAmount,
      recentPayments,
    ] = await Promise.all([
      this.db.db
        .select({ value: sum(schema.feeTransactions.amount) })
        .from(schema.feeTransactions)
        .where(and(...txnConditions(dayStart, dayEnd)))
        .then(sumOf),
      this.db.db
        .select({ value: sum(schema.feeTransactions.amount) })
        .from(schema.feeTransactions)
        .where(and(...txnConditions(monthStart)))
        .then(sumOf),
      this.db.db
        .select({ value: sum(schema.feeTransactions.amount) })
        .from(schema.feeTransactions)
        .where(and(...txnConditions()))
        .then(sumOf),
      this.db.db
        .select({ value: sum(schema.expenses.amount) })
        .from(schema.expenses)
        .where(
          and(
            eq(schema.expenses.tenantId, t),
            ...(branch ? [eq(schema.expenses.branchId, branch)] : []),
            gte(schema.expenses.expenseDate, dateStr(monthStart)),
          ),
        )
        .then(sumOf),
      this.db.db
        .select({ value: sum(schema.income.amount) })
        .from(schema.income)
        .where(
          and(
            eq(schema.income.tenantId, t),
            ...(branch ? [eq(schema.income.branchId, branch)] : []),
            gte(schema.income.incomeDate, dateStr(monthStart)),
          ),
        )
        .then(sumOf),
      this.db.db
        .select({ value: count() })
        .from(schema.feeInvoices)
        .where(
          and(
            eq(schema.feeInvoices.tenantId, t),
            ...(branch ? [eq(schema.feeInvoices.branchId, branch)] : []),
            eq(schema.feeInvoices.status, 'pending'),
          ),
        )
        .then((rows) => Number(rows[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.feeInvoices)
        .where(
          and(
            eq(schema.feeInvoices.tenantId, t),
            ...(branch ? [eq(schema.feeInvoices.branchId, branch)] : []),
            eq(schema.feeInvoices.status, 'overdue'),
          ),
        )
        .then((rows) => Number(rows[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.studentFeeAccounts)
        .where(
          and(
            eq(schema.studentFeeAccounts.tenantId, t),
            ...(branch ? [eq(schema.studentFeeAccounts.branchId, branch)] : []),
            eq(schema.studentFeeAccounts.status, 'active'),
            sql`${schema.studentFeeAccounts.totalDue} > 0`,
          ),
        )
        .then((rows) => Number(rows[0]?.value ?? 0)),
      this.db.db
        .select({ value: sum(schema.studentFeeAccounts.totalDue) })
        .from(schema.studentFeeAccounts)
        .where(
          and(
            eq(schema.studentFeeAccounts.tenantId, t),
            ...(branch ? [eq(schema.studentFeeAccounts.branchId, branch)] : []),
            eq(schema.studentFeeAccounts.status, 'active'),
          ),
        )
        .then(sumOf),
      this.db.db
        .select({
          id: schema.feeTransactions.id,
          transactionNo: schema.feeTransactions.transactionNo,
          amount: schema.feeTransactions.amount,
          paymentMethod: schema.feeTransactions.paymentMethod,
          paidDate: schema.feeTransactions.paidDate,
          firstName: schema.students.firstName,
          lastName: schema.students.lastName,
          admissionNumber: schema.students.admissionNumber,
        })
        .from(schema.feeTransactions)
        .innerJoin(
          schema.students,
          eq(schema.students.id, schema.feeTransactions.studentId),
        )
        .where(and(...txnConditions()))
        .orderBy(desc(schema.feeTransactions.createdAt))
        .limit(5),
    ]);

    return {
      asOf: dateStr(new Date()),
      fees: {
        collectedToday,
        collectedThisMonth,
        collectedTotal,
        pendingInvoices,
        overdueInvoices,
        dueAccounts,
        dueAmount,
      },
      expenses: { thisMonth: expensesThisMonth },
      income: { thisMonth: incomeThisMonth },
      net: { thisMonth: incomeThisMonth - expensesThisMonth },
      recentPayments,
    };
  }

  async hrOverview(params: { tenantId: string; branchId?: string | null }) {
    const { tenantId: t, branchId: branch } = params;

    const staffCond = () =>
      and(
        eq(schema.staff.tenantId, t),
        ...(branch ? [eq(schema.staff.branchId, branch)] : []),
      );

    const [
      staffTotal,
      staffActive,
      staffTeaching,
      staffPending,
      openLeaveRequests,
      approvedLeavesThisMonth,
      openJobPostings,
      jobApplicationsTotal,
      staffJoiningThisMonth,
    ] = await Promise.all([
      this.db.db
        .select({ value: count() })
        .from(schema.staff)
        .where(staffCond())
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.staff)
        .where(and(staffCond(), eq(schema.staff.isActive, true)))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.staff)
        .where(and(staffCond(), eq(schema.staff.isTeaching, true)))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.staff)
        .where(and(staffCond(), eq(schema.staff.isActive, false)))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.leaveRequests)
        .where(
          and(
            eq(schema.leaveRequests.tenantId, t),
            ...(branch ? [eq(schema.leaveRequests.branchId, branch)] : []),
            eq(schema.leaveRequests.status, 'pending'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.leaveRequests)
        .where(
          and(
            eq(schema.leaveRequests.tenantId, t),
            ...(branch ? [eq(schema.leaveRequests.branchId, branch)] : []),
            eq(schema.leaveRequests.status, 'approved'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.jobPostings)
        .where(
          and(
            eq(schema.jobPostings.tenantId, t),
            ...(branch ? [eq(schema.jobPostings.branchId, branch)] : []),
            eq(schema.jobPostings.status, 'open'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.jobApplications)
        .where(and(eq(schema.jobApplications.tenantId, t)))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.staff)
        .where(
          and(
            staffCond(),
            gte(schema.staff.joiningDate, dateStr(monthStartOf())),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
    ]);

    return {
      asOf: dateStr(new Date()),
      staff: {
        total: staffTotal,
        active: staffActive,
        teaching: staffTeaching,
        inactive: staffPending,
        joiningThisMonth: staffJoiningThisMonth,
      },
      leave: {
        pendingRequests: openLeaveRequests,
        approvedThisMonth: approvedLeavesThisMonth,
      },
      recruitment: {
        openPostings: openJobPostings,
        applications: jobApplicationsTotal,
      },
    };
  }

  async receptionOverview(params: {
    tenantId: string;
    branchId?: string | null;
  }) {
    const { tenantId: t, branchId: branch } = params;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [
      visitorsToday,
      visitorsCheckedIn,
      enquiriesNew,
      enquiriesTotal,
      pendingApplications,
      applicationsThisMonth,
      announcementsActive,
      circularsActive,
      recentVisitors,
    ] = await Promise.all([
      this.db.db
        .select({ value: count() })
        .from(schema.visitors)
        .where(
          and(
            eq(schema.visitors.tenantId, t),
            ...(branch ? [eq(schema.visitors.branchId, branch)] : []),
            gte(schema.visitors.checkInTime, dayStart),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.visitors)
        .where(
          and(
            eq(schema.visitors.tenantId, t),
            ...(branch ? [eq(schema.visitors.branchId, branch)] : []),
            eq(schema.visitors.status, 'checked_in'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.enquiries)
        .where(
          and(
            eq(schema.enquiries.tenantId, t),
            ...(branch ? [eq(schema.enquiries.branchId, branch)] : []),
            eq(schema.enquiries.status, 'new'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.enquiries)
        .where(
          and(
            eq(schema.enquiries.tenantId, t),
            ...(branch ? [eq(schema.enquiries.branchId, branch)] : []),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.applications)
        .where(
          and(
            eq(schema.applications.tenantId, t),
            ...(branch ? [eq(schema.applications.branchId, branch)] : []),
            eq(schema.applications.status, 'pending'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.applications)
        .where(
          and(
            eq(schema.applications.tenantId, t),
            ...(branch ? [eq(schema.applications.branchId, branch)] : []),
            gte(schema.applications.createdAt, dayStart),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.announcements)
        .where(
          and(
            eq(schema.announcements.tenantId, t),
            ...(branch ? [eq(schema.announcements.branchId, branch)] : []),
            isNotNull(schema.announcements.publishedAt),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.circulars)
        .where(
          and(
            eq(schema.circulars.tenantId, t),
            ...(branch ? [eq(schema.circulars.branchId, branch)] : []),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({
          id: schema.visitors.id,
          name: schema.visitors.name,
          purpose: schema.visitors.purpose,
          personToMeet: schema.visitors.personToMeet,
          status: schema.visitors.status,
          checkInTime: schema.visitors.checkInTime,
        })
        .from(schema.visitors)
        .where(
          and(
            eq(schema.visitors.tenantId, t),
            ...(branch ? [eq(schema.visitors.branchId, branch)] : []),
          ),
        )
        .orderBy(desc(schema.visitors.checkInTime))
        .limit(5),
    ]);

    return {
      asOf: dateStr(new Date()),
      visitors: {
        today: visitorsToday,
        checkedInNow: visitorsCheckedIn,
      },
      admissions: {
        newEnquiries: enquiriesNew,
        totalEnquiries: enquiriesTotal,
        pendingApplications,
        applicationsToday: applicationsThisMonth,
      },
      announcements: {
        active: announcementsActive,
        circulars: circularsActive,
      },
      recentVisitors,
    };
  }

  async librarianOverview(params: {
    tenantId: string;
    branchId?: string | null;
  }) {
    const { tenantId: t, branchId: branch } = params;
    const today = dateStr(new Date());

    const bookCond = () =>
      and(
        eq(schema.libraryBooks.tenantId, t),
        ...(branch ? [eq(schema.libraryBooks.branchId, branch)] : []),
      );
    const memberCond = () =>
      and(
        eq(schema.libraryMembers.tenantId, t),
        ...(branch ? [eq(schema.libraryMembers.branchId, branch)] : []),
      );
    const issueCond = () =>
      and(
        eq(schema.libraryIssues.tenantId, t),
        ...(branch ? [eq(schema.libraryIssues.branchId, branch)] : []),
      );

    const [
      booksTotal,
      booksAvailable,
      membersTotal,
      issuesActive,
      overdueIssues,
      dueToday,
      recentIssues,
    ] = await Promise.all([
      this.db.db
        .select({ value: count() })
        .from(schema.libraryBooks)
        .where(bookCond())
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.libraryBooks)
        .where(and(bookCond(), sql`${schema.libraryBooks.availableCopies} > 0`))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.libraryMembers)
        .where(and(memberCond(), eq(schema.libraryMembers.status, 'active')))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.libraryIssues)
        .where(and(issueCond(), eq(schema.libraryIssues.status, 'issued')))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.libraryIssues)
        .where(
          and(
            issueCond(),
            eq(schema.libraryIssues.status, 'issued'),
            sql`${schema.libraryIssues.dueDate} < ${today}`,
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.libraryIssues)
        .where(
          and(
            issueCond(),
            eq(schema.libraryIssues.status, 'issued'),
            eq(schema.libraryIssues.dueDate, today),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({
          id: schema.libraryIssues.id,
          status: schema.libraryIssues.status,
          dueDate: schema.libraryIssues.dueDate,
          bookTitle: schema.libraryBooks.title,
          bookIsbn: schema.libraryBooks.isbn,
          memberId: schema.libraryIssues.memberId,
          memberType: schema.libraryMembers.memberType,
        })
        .from(schema.libraryIssues)
        .innerJoin(
          schema.libraryBooks,
          eq(schema.libraryBooks.id, schema.libraryIssues.bookId),
        )
        .innerJoin(
          schema.libraryMembers,
          eq(schema.libraryMembers.id, schema.libraryIssues.memberId),
        )
        .where(issueCond())
        .orderBy(desc(schema.libraryIssues.createdAt))
        .limit(5),
    ]);

    return {
      asOf: today,
      books: { total: booksTotal, available: booksAvailable },
      members: { active: membersTotal },
      issues: {
        active: issuesActive,
        overdue: overdueIssues,
        dueToday,
      },
      recentIssues,
    };
  }

  async transportOverview(params: {
    tenantId: string;
    branchId?: string | null;
  }) {
    const { tenantId: t, branchId: branch } = params;
    const monthStart = dateStr(monthStartOf());

    const vehCond = () =>
      and(
        eq(schema.transportVehicles.tenantId, t),
        ...(branch ? [eq(schema.transportVehicles.branchId, branch)] : []),
      );
    const routeCond = () =>
      and(
        eq(schema.transportRoutes.tenantId, t),
        ...(branch ? [eq(schema.transportRoutes.branchId, branch)] : []),
      );

    const [
      vehiclesTotal,
      vehiclesActive,
      vehiclesInactive,
      routesActive,
      assignmentsActive,
      fuelCostThisMonth,
      maintenanceDue,
      recentFuelLogs,
    ] = await Promise.all([
      this.db.db
        .select({ value: count() })
        .from(schema.transportVehicles)
        .where(vehCond())
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.transportVehicles)
        .where(and(vehCond(), eq(schema.transportVehicles.status, 'active')))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.transportVehicles)
        .where(and(vehCond(), eq(schema.transportVehicles.isActive, false)))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.transportRoutes)
        .where(and(routeCond(), eq(schema.transportRoutes.status, 'active')))
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.transportAssignments)
        .where(
          and(
            eq(schema.transportAssignments.tenantId, t),
            ...(branch
              ? [eq(schema.transportAssignments.branchId, branch)]
              : []),
            eq(schema.transportAssignments.status, 'active'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: sum(schema.transportFuelLogs.totalCost) })
        .from(schema.transportFuelLogs)
        .where(
          and(
            eq(schema.transportFuelLogs.tenantId, t),
            ...(branch ? [eq(schema.transportFuelLogs.branchId, branch)] : []),
            gte(schema.transportFuelLogs.fuelDate, monthStart),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.transportMaintenance)
        .where(
          and(
            eq(schema.transportMaintenance.tenantId, t),
            ...(branch
              ? [eq(schema.transportMaintenance.branchId, branch)]
              : []),
            gte(schema.transportMaintenance.nextServiceDate, monthStart),
            lte(
              schema.transportMaintenance.nextServiceDate,
              dateStr(new Date()),
            ),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({
          id: schema.transportFuelLogs.id,
          fuelDate: schema.transportFuelLogs.fuelDate,
          quantityLiters: schema.transportFuelLogs.quantityLiters,
          totalCost: schema.transportFuelLogs.totalCost,
          vehicleNumber: schema.transportVehicles.vehicleNumber,
        })
        .from(schema.transportFuelLogs)
        .innerJoin(
          schema.transportVehicles,
          eq(schema.transportVehicles.id, schema.transportFuelLogs.vehicleId),
        )
        .where(
          and(
            eq(schema.transportFuelLogs.tenantId, t),
            ...(branch ? [eq(schema.transportFuelLogs.branchId, branch)] : []),
          ),
        )
        .orderBy(desc(schema.transportFuelLogs.fuelDate))
        .limit(5),
    ]);

    return {
      asOf: dateStr(new Date()),
      vehicles: {
        total: vehiclesTotal,
        active: vehiclesActive,
        inactive: vehiclesInactive,
      },
      routes: { active: routesActive },
      assignments: { active: assignmentsActive },
      fuel: {
        costThisMonth: fuelCostThisMonth,
        recent: recentFuelLogs,
      },
      maintenance: { dueNow: maintenanceDue },
    };
  }

  async hostelOverview(params: { tenantId: string; branchId?: string | null }) {
    const { tenantId: t, branchId: branch } = params;
    const today = dateStr(new Date());

    const roomCond = () =>
      and(
        eq(schema.hostelRooms.hostelId, schema.hostels.id),
        ...(branch ? [eq(schema.hostels.branchId, branch)] : []),
        eq(schema.hostels.tenantId, t),
      );

    const [
      hostelsActive,
      roomsTotal,
      roomsAvailable,
      roomsOccupied,
      activeAllocations,
      attendanceToday,
      attendancePresent,
      recentAllocations,
    ] = await Promise.all([
      this.db.db
        .select({ value: count() })
        .from(schema.hostels)
        .where(
          and(
            eq(schema.hostels.tenantId, t),
            ...(branch ? [eq(schema.hostels.branchId, branch)] : []),
            eq(schema.hostels.status, 'active'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.hostelRooms)
        .innerJoin(
          schema.hostels,
          eq(schema.hostels.id, schema.hostelRooms.hostelId),
        )
        .where(roomCond())
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.hostelRooms)
        .innerJoin(
          schema.hostels,
          eq(schema.hostels.id, schema.hostelRooms.hostelId),
        )
        .where(
          and(
            roomCond(),
            or(
              eq(schema.hostelRooms.status, 'available'),
              eq(schema.hostelRooms.status, 'vacant'),
            ),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.hostelRooms)
        .innerJoin(
          schema.hostels,
          eq(schema.hostels.id, schema.hostelRooms.hostelId),
        )
        .where(
          and(
            roomCond(),
            or(
              eq(schema.hostelRooms.status, 'occupied'),
              eq(schema.hostelRooms.status, 'full'),
            ),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.hostelBedAllocations)
        .where(
          and(
            eq(schema.hostelBedAllocations.tenantId, t),
            ...(branch
              ? [eq(schema.hostelBedAllocations.branchId, branch)]
              : []),
            eq(schema.hostelBedAllocations.status, 'active'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.hostelAttendance)
        .where(
          and(
            eq(schema.hostelAttendance.tenantId, t),
            ...(branch ? [eq(schema.hostelAttendance.branchId, branch)] : []),
            eq(schema.hostelAttendance.date, today),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({ value: count() })
        .from(schema.hostelAttendance)
        .where(
          and(
            eq(schema.hostelAttendance.tenantId, t),
            ...(branch ? [eq(schema.hostelAttendance.branchId, branch)] : []),
            eq(schema.hostelAttendance.date, today),
            eq(schema.hostelAttendance.status, 'present'),
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
      this.db.db
        .select({
          id: schema.hostelBedAllocations.id,
          studentId: schema.hostelBedAllocations.studentId,
          status: schema.hostelBedAllocations.status,
          roomNumber: schema.hostelRooms.roomNumber,
          hostelName: schema.hostels.name,
          studentName: sql`${schema.students.firstName} || ' ' || ${schema.students.lastName}`,
        })
        .from(schema.hostelBedAllocations)
        .innerJoin(
          schema.hostelRooms,
          eq(schema.hostelRooms.id, schema.hostelBedAllocations.roomId),
        )
        .innerJoin(
          schema.hostels,
          eq(schema.hostels.id, schema.hostelRooms.hostelId),
        )
        .innerJoin(
          schema.students,
          eq(schema.students.id, schema.hostelBedAllocations.studentId),
        )
        .where(
          and(
            eq(schema.hostelBedAllocations.tenantId, t),
            ...(branch
              ? [eq(schema.hostelBedAllocations.branchId, branch)]
              : []),
            eq(schema.hostelBedAllocations.status, 'active'),
          ),
        )
        .orderBy(desc(schema.hostelBedAllocations.createdAt))
        .limit(5),
    ]);

    return {
      asOf: today,
      hostels: { active: hostelsActive },
      rooms: {
        total: roomsTotal,
        available: roomsAvailable,
        occupied: roomsOccupied,
        occupancyRate:
          roomsTotal > 0 ? Math.round((roomsOccupied / roomsTotal) * 100) : 0,
      },
      allocations: { active: activeAllocations, recent: recentAllocations },
      attendance: {
        today: attendanceToday,
        present: attendancePresent,
        absent: attendanceToday - attendancePresent,
      },
    };
  }
}

function monthStartOf(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
