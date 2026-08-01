import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import {
  eq,
  and,
  isNull,
  or,
  desc,
  asc,
  count,
  sql,
  inArray,
  gte,
  lte,
} from 'drizzle-orm';

const VALID_STATUSES = ['present', 'absent', 'late', 'excused'] as const;

@Injectable()
export class AttendanceService {
  constructor(private readonly db: DatabaseProvider) {}

  // ─── Validation Helpers ─────────────────────────────────────────────────

  private async validateTimetableEntry(
    timetableEntryId: string,
    branchId: string,
  ) {
    const [entry] = await this.db.db
      .select({
        id: schema.timetableEntries.id,
        tenantId: schema.timetableEntries.tenantId,
        subjectId: schema.timetableEntries.subjectId,
        dayOfWeek: schema.timetableEntries.dayOfWeek,
        startTime: schema.timetableEntries.startTime,
        endTime: schema.timetableEntries.endTime,
      })
      .from(schema.timetableEntries)
      .innerJoin(
        schema.timetables,
        eq(schema.timetables.id, schema.timetableEntries.timetableId),
      )
      .where(
        and(
          eq(schema.timetableEntries.id, timetableEntryId),
          eq(schema.timetables.branchId, branchId),
        ),
      )
      .limit(1);

    if (!entry)
      throw new NotFoundException('Timetable entry not found in this branch');
    return entry;
  }

  private async validateStudents(
    studentIds: string[],
    tenantId: string,
    branchId: string,
  ) {
    if (!studentIds.length)
      throw new BadRequestException('At least one student is required');

    const existing = await this.db.db
      .select({ id: schema.students.id })
      .from(schema.students)
      .where(
        and(
          inArray(schema.students.id, studentIds),
          eq(schema.students.tenantId, tenantId),
          eq(schema.students.branchId, branchId),
          eq(schema.students.isActive, true),
        ),
      );

    if (existing.length !== studentIds.length) {
      const found = new Set(existing.map((s) => s.id));
      const missing = studentIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Invalid or inactive students: ${missing.join(', ')}`,
      );
    }
  }

  private validateDate(dateStr: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today)
      throw new BadRequestException('Cannot mark attendance for a future date');

    return dateStr;
  }

  // ─── Create Session + Records ───────────────────────────────────────────

  async createSession(params: {
    tenantId: string;
    branchId: string;
    createdBy: string;
    timetableEntryId: string;
    date: string;
    records: Array<{ studentId: string; status: string; remarks?: string }>;
  }) {
    const entry = await this.validateTimetableEntry(
      params.timetableEntryId,
      params.branchId,
    );
    const dateStr = this.validateDate(params.date);

    await this.validateStudents(
      params.records.map((r) => r.studentId),
      params.tenantId,
      params.branchId,
    );

    const dayOfWeek = new Date(dateStr).getDay();
    if (entry.dayOfWeek !== dayOfWeek) {
      throw new BadRequestException(
        `Date (${dateStr}) is a ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}, ` +
          `but this timetable entry is for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][entry.dayOfWeek]}`,
      );
    }

    const existingSession = await this.db.db
      .select({ id: schema.attendance.id })
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.timetableEntryId, params.timetableEntryId),
          eq(schema.attendance.date, dateStr),
          eq(schema.attendance.branchId, params.branchId),
        ),
      )
      .limit(1);

    if (existingSession.length) {
      throw new ConflictException(
        'Attendance already marked for this timetable entry on this date',
      );
    }

    let sessionId = '';

    await this.db.db.transaction(async (tx) => {
      const [session] = await tx
        .insert(schema.attendance)
        .values({
          tenantId: params.tenantId,
          branchId: params.branchId,
          classId: null,
          sectionId: null,
          subjectId: entry.subjectId,
          timetableEntryId: params.timetableEntryId,
          date: dateStr,
          startTime: entry.startTime,
          endTime: entry.endTime,
          totalStudents: params.records.length,
          createdBy: params.createdBy,
        })
        .returning({ id: schema.attendance.id });

      sessionId = session.id;

      const presentCount = params.records.filter(
        (r) => r.status === 'present',
      ).length;
      const absentCount = params.records.filter(
        (r) => r.status === 'absent',
      ).length;

      const values = params.records.map((r) => ({
        tenantId: params.tenantId,
        branchId: params.branchId,
        attendanceId: sessionId,
        studentId: r.studentId,
        status: r.status,
        remarks: r.remarks || null,
        markedBy: params.createdBy,
      }));

      await tx.insert(schema.attendanceRecords).values(values);

      await tx
        .update(schema.attendance)
        .set({
          totalPresent: presentCount,
          totalAbsent: absentCount,
          updatedAt: new Date(),
        })
        .where(eq(schema.attendance.id, sessionId));
    });

    return this.getSessionById(sessionId, params.branchId);
  }

  // ─── Get Session ────────────────────────────────────────────────────────

  async getSessionById(id: string, branchId: string) {
    const [session] = await this.db.db
      .select()
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.id, id),
          eq(schema.attendance.branchId, branchId),
        ),
      )
      .limit(1);

    if (!session) throw new NotFoundException('Attendance session not found');

    const records = await this.db.db
      .select({
        id: schema.attendanceRecords.id,
        studentId: schema.attendanceRecords.studentId,
        status: schema.attendanceRecords.status,
        remarks: schema.attendanceRecords.remarks,
        markedBy: schema.attendanceRecords.markedBy,
        createdAt: schema.attendanceRecords.createdAt,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        admissionNumber: schema.students.admissionNumber,
        rollNumber: schema.students.rollNumber,
      })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.students,
        eq(schema.students.id, schema.attendanceRecords.studentId),
      )
      .where(eq(schema.attendanceRecords.attendanceId, id))
      .orderBy(schema.students.rollNumber);

    return { ...session, records };
  }

  // ─── Update Single Record ───────────────────────────────────────────────

  async updateRecord(
    recordId: string,
    branchId: string,
    params: { status?: string; remarks?: string },
  ) {
    const [record] = await this.db.db
      .select({
        id: schema.attendanceRecords.id,
        attendanceId: schema.attendanceRecords.attendanceId,
      })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.attendance,
        eq(schema.attendance.id, schema.attendanceRecords.attendanceId),
      )
      .where(
        and(
          eq(schema.attendanceRecords.id, recordId),
          eq(schema.attendance.branchId, branchId),
        ),
      )
      .limit(1);

    if (!record) throw new NotFoundException('Attendance record not found');

    const updateData: any = { updatedAt: new Date() };
    if (params.status) updateData.status = params.status;
    if (params.remarks !== undefined) updateData.remarks = params.remarks;

    await this.db.db
      .update(schema.attendanceRecords)
      .set(updateData)
      .where(eq(schema.attendanceRecords.id, recordId));

    await this.recalculateSession(record.attendanceId);

    return this.db.db
      .select()
      .from(schema.attendanceRecords)
      .where(eq(schema.attendanceRecords.id, recordId))
      .limit(1)
      .then((r) => r[0]);
  }

  private async recalculateSession(attendanceId: string) {
    const [counts] = await this.db.db
      .select({
        present:
          sql`COUNT(*) FILTER (WHERE ${schema.attendanceRecords.status} = 'present')`.as<number>(),
        absent:
          sql`COUNT(*) FILTER (WHERE ${schema.attendanceRecords.status} = 'absent')`.as<number>(),
      })
      .from(schema.attendanceRecords)
      .where(eq(schema.attendanceRecords.attendanceId, attendanceId));

    await this.db.db
      .update(schema.attendance)
      .set({
        totalPresent: counts.present,
        totalAbsent: counts.absent,
        updatedAt: new Date(),
      })
      .where(eq(schema.attendance.id, attendanceId));
  }

  // ─── List Sessions ──────────────────────────────────────────────────────

  async findByBranch(
    branchId: string,
    query: {
      page?: number;
      limit?: number;
      classId?: string;
      sectionId?: string;
      fromDate?: string;
      toDate?: string;
      status?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.attendance.branchId, branchId)];

    if (query.classId)
      conditions.push(eq(schema.attendance.classId, query.classId));
    if (query.sectionId)
      conditions.push(eq(schema.attendance.sectionId, query.sectionId));
    if (query.fromDate)
      conditions.push(gte(schema.attendance.date, query.fromDate));
    if (query.toDate)
      conditions.push(lte(schema.attendance.date, query.toDate));

    const data = await this.db.db
      .select({
        id: schema.attendance.id,
        date: schema.attendance.date,
        startTime: schema.attendance.startTime,
        endTime: schema.attendance.endTime,
        totalPresent: schema.attendance.totalPresent,
        totalAbsent: schema.attendance.totalAbsent,
        totalStudents: schema.attendance.totalStudents,
        createdAt: schema.attendance.createdAt,
        className: schema.classes.name,
        subjectName: schema.subjects.name,
      })
      .from(schema.attendance)
      .leftJoin(
        schema.classes,
        eq(schema.classes.id, schema.attendance.classId),
      )
      .leftJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.attendance.subjectId),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.attendance.date))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.attendance)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  // ─── Student Records ────────────────────────────────────────────────────

  async findByStudent(
    studentId: string,
    branchId: string,
    query: {
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.attendanceRecords.studentId, studentId),
      eq(schema.attendanceRecords.branchId, branchId),
    ];

    if (query.fromDate)
      conditions.push(gte(schema.attendance.date, query.fromDate));
    if (query.toDate)
      conditions.push(lte(schema.attendance.date, query.toDate));

    const data = await this.db.db
      .select({
        id: schema.attendanceRecords.id,
        date: schema.attendance.date,
        status: schema.attendanceRecords.status,
        remarks: schema.attendanceRecords.remarks,
        startTime: schema.attendance.startTime,
        endTime: schema.attendance.endTime,
        subjectName: schema.subjects.name,
      })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.attendance,
        eq(schema.attendance.id, schema.attendanceRecords.attendanceId),
      )
      .leftJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.attendance.subjectId),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.attendance.date))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.attendance,
        eq(schema.attendance.id, schema.attendanceRecords.attendanceId),
      )
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  async getSummary(
    studentId: string,
    branchId: string,
    query: { fromDate?: string; toDate?: string },
  ) {
    const conditions: any[] = [
      eq(schema.attendanceRecords.studentId, studentId),
      eq(schema.attendanceRecords.branchId, branchId),
    ];
    if (query.fromDate)
      conditions.push(gte(schema.attendance.date, query.fromDate));
    if (query.toDate)
      conditions.push(lte(schema.attendance.date, query.toDate));

    const counts = await this.db.db
      .select({
        total: count().as<number>(),
        present:
          sql`COUNT(*) FILTER (WHERE ${schema.attendanceRecords.status} = 'present')`.as<number>(),
        absent:
          sql`COUNT(*) FILTER (WHERE ${schema.attendanceRecords.status} = 'absent')`.as<number>(),
        late: sql`COUNT(*) FILTER (WHERE ${schema.attendanceRecords.status} = 'late')`.as<number>(),
        excused:
          sql`COUNT(*) FILTER (WHERE ${schema.attendanceRecords.status} = 'excused')`.as<number>(),
      })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.attendance,
        eq(schema.attendance.id, schema.attendanceRecords.attendanceId),
      )
      .where(and(...conditions))
      .then((r) => r[0]);

    const total = Number(counts.total) || 0;
    return {
      total,
      present: Number(counts.present),
      absent: Number(counts.absent),
      late: Number(counts.late),
      excused: Number(counts.excused),
      percentage:
        total > 0
          ? Math.round(
              ((Number(counts.present) + Number(counts.late)) / total) * 100,
            )
          : 0,
    };
  }

  // ─── Daily Report ────────────────────────────────────────────────────────

  async getDailyReport(branchId: string, date: string) {
    this.validateDate(date);

    const sessions = await this.db.db
      .select({
        id: schema.attendance.id,
        classId: schema.attendance.classId,
        startTime: schema.attendance.startTime,
        endTime: schema.attendance.endTime,
        totalPresent: schema.attendance.totalPresent,
        totalAbsent: schema.attendance.totalAbsent,
        totalStudents: schema.attendance.totalStudents,
        className: schema.classes.name,
        subjectName: schema.subjects.name,
      })
      .from(schema.attendance)
      .leftJoin(
        schema.classes,
        eq(schema.classes.id, schema.attendance.classId),
      )
      .leftJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.attendance.subjectId),
      )
      .where(
        and(
          eq(schema.attendance.branchId, branchId),
          eq(schema.attendance.date, date),
        ),
      )
      .orderBy(schema.attendance.startTime);

    const totals = sessions.reduce(
      (acc, s) => ({
        present: acc.present + Number(s.totalPresent),
        absent: acc.absent + Number(s.totalAbsent),
        total: acc.total + Number(s.totalStudents),
      }),
      { present: 0, absent: 0, total: 0 },
    );

    return {
      date,
      sessions,
      summary: {
        ...totals,
        percentage:
          totals.total > 0
            ? Math.round((totals.present / totals.total) * 100)
            : 0,
      },
    };
  }
}
