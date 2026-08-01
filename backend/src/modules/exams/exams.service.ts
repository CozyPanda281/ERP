import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, asc, count, sql, inArray, gte, lte } from 'drizzle-orm';

@Injectable()
export class ExamsService {
  constructor(private readonly db: DatabaseProvider) {}

  // ─── Exams CRUD ───────────────────────────────────────────────────────────

  async createExam(params: {
    tenantId: string;
    branchId: string;
    name: string;
    examType?: string;
    classId: string;
    academicYearId?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) {
    const [existing] = await this.db.db
      .select({ id: schema.exams.id })
      .from(schema.exams)
      .where(
        and(
          eq(schema.exams.branchId, params.branchId),
          eq(schema.exams.name, params.name),
        ),
      )
      .limit(1);
    if (existing)
      throw new ConflictException('Exam with this name already exists');

    if (
      params.startDate &&
      params.endDate &&
      new Date(params.endDate) < new Date(params.startDate)
    ) {
      throw new BadRequestException('End date must be after start date');
    }

    const [inserted] = await this.db.db
      .insert(schema.exams)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        name: params.name,
        examType: params.examType || 'unit_test',
        classId: params.classId,
        academicYearId: params.academicYearId,
        startDate: params.startDate,
        endDate: params.endDate,
        description: params.description,
      })
      .returning({ id: schema.exams.id });

    return this.findExamById(inserted.id, params.branchId);
  }

  async findExamById(id: string, branchId?: string) {
    const conditions: any[] = [eq(schema.exams.id, id)];
    if (branchId) conditions.push(eq(schema.exams.branchId, branchId));

    const [result] = await this.db.db
      .select()
      .from(schema.exams)
      .where(and(...conditions))
      .limit(1);
    if (!result) throw new NotFoundException('Exam not found');
    return result;
  }

  async findExamsByBranch(
    branchId: string,
    query: {
      page?: number;
      limit?: number;
      classId?: string;
      examType?: string;
      isActive?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.exams.branchId, branchId)];

    if (query.classId) conditions.push(eq(schema.exams.classId, query.classId));
    if (query.examType)
      conditions.push(eq(schema.exams.examType, query.examType));
    if (query.isActive !== undefined)
      conditions.push(eq(schema.exams.isActive, query.isActive === 'true'));

    const data = await this.db.db
      .select({
        id: schema.exams.id,
        name: schema.exams.name,
        examType: schema.exams.examType,
        startDate: schema.exams.startDate,
        endDate: schema.exams.endDate,
        isActive: schema.exams.isActive,
        description: schema.exams.description,
        createdAt: schema.exams.createdAt,
        className: schema.classes.name,
      })
      .from(schema.exams)
      .leftJoin(schema.classes, eq(schema.classes.id, schema.exams.classId))
      .where(and(...conditions))
      .orderBy(desc(schema.exams.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.exams)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async updateExam(id: string, params: any) {
    await this.findExamById(id);
    if (
      params.startDate &&
      params.endDate &&
      new Date(params.endDate) < new Date(params.startDate)
    ) {
      throw new BadRequestException('End date must be after start date');
    }
    const allowed: any = {};
    if (params.name !== undefined) allowed.name = params.name;
    if (params.examType !== undefined) allowed.examType = params.examType;
    if (params.startDate !== undefined) allowed.startDate = params.startDate;
    if (params.endDate !== undefined) allowed.endDate = params.endDate;
    if (params.isActive !== undefined) allowed.isActive = params.isActive;
    if (params.description !== undefined)
      allowed.description = params.description;
    if (params.classId !== undefined) allowed.classId = params.classId;
    allowed.updatedAt = new Date();
    await this.db.db
      .update(schema.exams)
      .set(allowed)
      .where(eq(schema.exams.id, id));
    return this.findExamById(id);
  }

  async deleteExam(id: string) {
    await this.findExamById(id);
    await this.db.db.delete(schema.exams).where(eq(schema.exams.id, id));
  }

  // ─── Schedules ────────────────────────────────────────────────────────────

  async createSchedule(
    examId: string,
    params: {
      subjectId: string;
      classId?: string;
      date: string;
      startTime?: string;
      endTime?: string;
      maxMarks?: number;
      passMarks?: number;
      roomNumber?: string;
      invigilatorId?: string;
    },
  ) {
    const exam = await this.findExamById(examId);

    const [existing] = await this.db.db
      .select({ id: schema.examSchedules.id })
      .from(schema.examSchedules)
      .where(
        and(
          eq(schema.examSchedules.examId, examId),
          eq(schema.examSchedules.subjectId, params.subjectId),
        ),
      )
      .limit(1);
    if (existing)
      throw new ConflictException(
        'Schedule for this subject already exists in this exam',
      );

    if (
      params.passMarks !== undefined &&
      params.maxMarks !== undefined &&
      params.passMarks > params.maxMarks
    ) {
      throw new BadRequestException('Pass marks cannot exceed max marks');
    }

    const [schedule] = await this.db.db
      .insert(schema.examSchedules)
      .values({
        tenantId: (exam as any).tenantId,
        examId,
        subjectId: params.subjectId,
        classId: params.classId,
        date: params.date,
        startTime: params.startTime,
        endTime: params.endTime,
        maxMarks: params.maxMarks ?? 100,
        passMarks: params.passMarks ?? 33,
        roomNumber: params.roomNumber,
        invigilatorId: params.invigilatorId,
      })
      .returning({ id: schema.examSchedules.id });

    return this.findScheduleById(schedule.id);
  }

  async findScheduleById(id: string) {
    const conditions: any[] = [eq(schema.examSchedules.id, id)];

    const [result] = await this.db.db
      .select({
        id: schema.examSchedules.id,
        examId: schema.examSchedules.examId,
        subjectId: schema.examSchedules.subjectId,
        classId: schema.examSchedules.classId,
        date: schema.examSchedules.date,
        startTime: schema.examSchedules.startTime,
        endTime: schema.examSchedules.endTime,
        maxMarks: schema.examSchedules.maxMarks,
        passMarks: schema.examSchedules.passMarks,
        roomNumber: schema.examSchedules.roomNumber,
        invigilatorId: schema.examSchedules.invigilatorId,
        createdAt: schema.examSchedules.createdAt,
        subjectName: schema.subjects.name,
      })
      .from(schema.examSchedules)
      .leftJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.examSchedules.subjectId),
      )
      .where(and(...conditions))
      .limit(1);
    if (!result) throw new NotFoundException('Exam schedule not found');
    return result;
  }

  async findSchedulesByExam(examId: string) {
    await this.findExamById(examId);
    return this.db.db
      .select({
        id: schema.examSchedules.id,
        subjectId: schema.examSchedules.subjectId,
        date: schema.examSchedules.date,
        startTime: schema.examSchedules.startTime,
        endTime: schema.examSchedules.endTime,
        maxMarks: schema.examSchedules.maxMarks,
        passMarks: schema.examSchedules.passMarks,
        roomNumber: schema.examSchedules.roomNumber,
        invigilatorId: schema.examSchedules.invigilatorId,
        subjectName: schema.subjects.name,
      })
      .from(schema.examSchedules)
      .leftJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.examSchedules.subjectId),
      )
      .where(eq(schema.examSchedules.examId, examId))
      .orderBy(schema.examSchedules.date);
  }

  async updateSchedule(id: string, params: any) {
    await this.findScheduleById(id);
    if (
      params.passMarks !== undefined &&
      params.maxMarks !== undefined &&
      params.passMarks > params.maxMarks
    ) {
      throw new BadRequestException('Pass marks cannot exceed max marks');
    }
    await this.db.db
      .update(schema.examSchedules)
      .set({ ...params, updatedAt: new Date() })
      .where(eq(schema.examSchedules.id, id));
    return this.findScheduleById(id);
  }

  async deleteSchedule(id: string) {
    await this.findScheduleById(id);
    await this.db.db
      .delete(schema.examSchedules)
      .where(eq(schema.examSchedules.id, id));
  }

  // ─── Marks ────────────────────────────────────────────────────────────────

  async bulkEnterMarks(params: {
    tenantId: string;
    branchId: string;
    enteredBy: string;
    examScheduleId: string;
    marks: Array<{
      studentId: string;
      marksObtained?: number;
      isAbsent?: boolean;
      isMalpractice?: boolean;
      grade?: string;
      gradePoint?: number;
      remarks?: string;
    }>;
  }) {
    const [schedule] = await this.db.db
      .select({
        id: schema.examSchedules.id,
        maxMarks: schema.examSchedules.maxMarks,
      })
      .from(schema.examSchedules)
      .where(eq(schema.examSchedules.id, params.examScheduleId))
      .limit(1);
    if (!schedule) throw new NotFoundException('Exam schedule not found');

    if (!params.marks.length)
      throw new BadRequestException('At least one mark entry is required');

    const studentIds = params.marks.map((m) => m.studentId);
    const existingStudents = await this.db.db
      .select({ id: schema.students.id })
      .from(schema.students)
      .where(
        and(
          inArray(schema.students.id, studentIds),
          eq(schema.students.isActive, true),
        ),
      );

    if (existingStudents.length !== studentIds.length) {
      const found = new Set(existingStudents.map((s) => s.id));
      const missing = studentIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Invalid or inactive students: ${missing.join(', ')}`,
      );
    }

    for (const mark of params.marks) {
      if (mark.isAbsent && mark.marksObtained) {
        throw new BadRequestException(
          `Student ${mark.studentId}: cannot have marks when absent`,
        );
      }
      if (!mark.isAbsent && mark.marksObtained !== undefined) {
        if (mark.marksObtained < 0)
          throw new BadRequestException(
            `Student ${mark.studentId}: marks cannot be negative`,
          );
        if (
          schedule.maxMarks !== null &&
          mark.marksObtained > schedule.maxMarks
        ) {
          throw new BadRequestException(
            `Student ${mark.studentId}: marks (${mark.marksObtained}) exceed max (${schedule.maxMarks})`,
          );
        }
      }
    }

    const existingMarks = await this.db.db
      .select({ studentId: schema.marks.studentId })
      .from(schema.marks)
      .where(eq(schema.marks.examScheduleId, params.examScheduleId));

    if (existingMarks.length) {
      throw new ConflictException(
        'Marks already entered for this schedule. Use update instead.',
      );
    }

    const values = params.marks.map((m) => ({
      tenantId: params.tenantId,
      branchId: params.branchId,
      examScheduleId: params.examScheduleId,
      studentId: m.studentId,
      marksObtained: m.isAbsent
        ? null
        : m.marksObtained != null
          ? String(m.marksObtained)
          : null,
      maxMarks: schedule.maxMarks ?? 100,
      isAbsent: m.isAbsent || false,
      isMalpractice: m.isMalpractice || false,
      grade: m.grade || null,
      gradePoint: m.gradePoint != null ? String(m.gradePoint) : null,
      remarks: m.remarks || null,
      enteredBy: params.enteredBy,
      enteredAt: new Date(),
    }));

    await this.db.db.insert(schema.marks).values(values);
    return this.findMarksBySchedule(params.examScheduleId, {});
  }

  async findMarksBySchedule(
    examScheduleId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const offset = (page - 1) * limit;

    const data = await this.db.db
      .select({
        id: schema.marks.id,
        studentId: schema.marks.studentId,
        marksObtained: schema.marks.marksObtained,
        maxMarks: schema.marks.maxMarks,
        isAbsent: schema.marks.isAbsent,
        isMalpractice: schema.marks.isMalpractice,
        grade: schema.marks.grade,
        gradePoint: schema.marks.gradePoint,
        remarks: schema.marks.remarks,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        admissionNumber: schema.students.admissionNumber,
        rollNumber: schema.students.rollNumber,
      })
      .from(schema.marks)
      .innerJoin(
        schema.students,
        eq(schema.students.id, schema.marks.studentId),
      )
      .where(eq(schema.marks.examScheduleId, examScheduleId))
      .orderBy(schema.students.rollNumber)
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.marks)
      .where(eq(schema.marks.examScheduleId, examScheduleId));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findMarksByStudent(
    studentId: string,
    branchId: string,
    query: { examId?: string; page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.marks.studentId, studentId),
      eq(schema.marks.branchId, branchId),
    ];

    const data = await this.db.db
      .select({
        id: schema.marks.id,
        marksObtained: schema.marks.marksObtained,
        maxMarks: schema.marks.maxMarks,
        isAbsent: schema.marks.isAbsent,
        grade: schema.marks.grade,
        gradePoint: schema.marks.gradePoint,
        examName: schema.exams.name,
        subjectName: schema.subjects.name,
        examDate: schema.examSchedules.date,
      })
      .from(schema.marks)
      .innerJoin(
        schema.examSchedules,
        eq(schema.examSchedules.id, schema.marks.examScheduleId),
      )
      .innerJoin(schema.exams, eq(schema.exams.id, schema.examSchedules.examId))
      .leftJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.examSchedules.subjectId),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.examSchedules.date))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.marks)
      .innerJoin(
        schema.examSchedules,
        eq(schema.examSchedules.id, schema.marks.examScheduleId),
      )
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async updateMark(
    id: string,
    branchId: string,
    params: {
      marksObtained?: number;
      isAbsent?: boolean;
      isMalpractice?: boolean;
      grade?: string;
      gradePoint?: number;
      remarks?: string;
    },
  ) {
    const [mark] = await this.db.db
      .select({
        id: schema.marks.id,
        examScheduleId: schema.marks.examScheduleId,
        maxMarks: schema.marks.maxMarks,
        studentId: schema.marks.studentId,
      })
      .from(schema.marks)
      .innerJoin(
        schema.examSchedules,
        eq(schema.examSchedules.id, schema.marks.examScheduleId),
      )
      .innerJoin(schema.exams, eq(schema.exams.id, schema.examSchedules.examId))
      .where(and(eq(schema.marks.id, id), eq(schema.exams.branchId, branchId)))
      .limit(1);

    if (!mark) throw new NotFoundException('Mark record not found');

    if (params.isAbsent && params.marksObtained) {
      throw new BadRequestException('Cannot have marks when absent');
    }
    if (!params.isAbsent && params.marksObtained !== undefined) {
      if (params.marksObtained < 0)
        throw new BadRequestException('Marks cannot be negative');
      if (mark.maxMarks !== null && params.marksObtained > mark.maxMarks)
        throw new BadRequestException(`Marks exceed max (${mark.maxMarks})`);
    }

    const updateData: any = { ...params, updatedAt: new Date() };
    if (updateData.marksObtained !== undefined)
      updateData.marksObtained = String(updateData.marksObtained);
    await this.db.db
      .update(schema.marks)
      .set(updateData)
      .where(eq(schema.marks.id, id));

    const [updated] = await this.db.db
      .select()
      .from(schema.marks)
      .where(eq(schema.marks.id, id))
      .limit(1);
    return updated;
  }

  // ─── Results ──────────────────────────────────────────────────────────────

  async generateResults(examId: string) {
    const exam = await this.findExamById(examId);

    const schedules = await this.db.db
      .select({ id: schema.examSchedules.id })
      .from(schema.examSchedules)
      .where(eq(schema.examSchedules.examId, examId));

    if (!schedules.length)
      throw new BadRequestException('No schedules found for this exam');

    const scheduleIds = schedules.map((s) => s.id);

    const marksCount = await this.db.db
      .select({
        scheduleId: schema.marks.examScheduleId,
        count: count(),
      })
      .from(schema.marks)
      .where(inArray(schema.marks.examScheduleId, scheduleIds))
      .groupBy(schema.marks.examScheduleId);

    if (marksCount.length !== schedules.length) {
      throw new BadRequestException(
        'Marks not entered for all schedules. Generate results after all marks are entered.',
      );
    }

    const examMarks = await this.db.db
      .select({
        studentId: schema.marks.studentId,
        marksObtained: schema.marks.marksObtained,
        maxMarks: schema.marks.maxMarks,
        isAbsent: schema.marks.isAbsent,
      })
      .from(schema.marks)
      .where(inArray(schema.marks.examScheduleId, scheduleIds));

    const studentMap = new Map<
      string,
      { total: number; maxTotal: number; absentCount: number }
    >();
    for (const m of examMarks) {
      const entry = studentMap.get(m.studentId) || {
        total: 0,
        maxTotal: 0,
        absentCount: 0,
      };
      if (m.isAbsent) {
        entry.absentCount++;
      } else {
        entry.total += Number(m.marksObtained) || 0;
      }
      entry.maxTotal += Number(m.maxMarks) || 0;
      studentMap.set(m.studentId, entry);
    }

    const totalSubjects = schedules.length;
    const results = Array.from(studentMap.entries()).map(
      ([studentId, data]) => {
        const percentage =
          data.maxTotal > 0
            ? parseFloat(((data.total / data.maxTotal) * 100).toFixed(2))
            : 0;
        const isPass = percentage >= 33;
        const grade =
          percentage >= 90
            ? 'A+'
            : percentage >= 75
              ? 'A'
              : percentage >= 60
                ? 'B'
                : percentage >= 45
                  ? 'C'
                  : percentage >= 33
                    ? 'D'
                    : 'F';
        return {
          tenantId: exam.tenantId,
          branchId: exam.branchId,
          examId,
          studentId,
          totalMarks: data.total.toString(),
          percentage: percentage.toString(),
          grade,
          resultStatus: isPass ? 'pass' : 'fail',
          remarks:
            data.absentCount > 0
              ? `Absent in ${data.absentCount} subject(s)`
              : null,
        };
      },
    );

    await this.db.db
      .delete(schema.examResults)
      .where(eq(schema.examResults.examId, examId));

    if (results.length) {
      await this.db.db.insert(schema.examResults).values(results);

      const ranked = results
        .sort((a, b) => Number(b.percentage) - Number(a.percentage))
        .map((r, i) => ({ studentId: r.studentId, rank: i + 1 }));

      for (const r of ranked) {
        await this.db.db
          .update(schema.examResults)
          .set({ rank: r.rank })
          .where(
            and(
              eq(schema.examResults.examId, examId),
              eq(schema.examResults.studentId, r.studentId),
            ),
          );
      }
    }

    return this.findResultsByExam(examId);
  }

  async findResultsByExam(examId: string) {
    await this.findExamById(examId);

    const data = await this.db.db
      .select({
        id: schema.examResults.id,
        studentId: schema.examResults.studentId,
        totalMarks: schema.examResults.totalMarks,
        percentage: schema.examResults.percentage,
        grade: schema.examResults.grade,
        rank: schema.examResults.rank,
        resultStatus: schema.examResults.resultStatus,
        remarks: schema.examResults.remarks,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        admissionNumber: schema.students.admissionNumber,
        rollNumber: schema.students.rollNumber,
      })
      .from(schema.examResults)
      .innerJoin(
        schema.students,
        eq(schema.students.id, schema.examResults.studentId),
      )
      .where(eq(schema.examResults.examId, examId))
      .orderBy(schema.examResults.rank);

    return data;
  }

  async findResultByStudent(studentId: string, examId: string) {
    const [result] = await this.db.db
      .select({
        id: schema.examResults.id,
        totalMarks: schema.examResults.totalMarks,
        percentage: schema.examResults.percentage,
        grade: schema.examResults.grade,
        rank: schema.examResults.rank,
        resultStatus: schema.examResults.resultStatus,
        remarks: schema.examResults.remarks,
        examName: schema.exams.name,
      })
      .from(schema.examResults)
      .innerJoin(schema.exams, eq(schema.exams.id, schema.examResults.examId))
      .where(
        and(
          eq(schema.examResults.examId, examId),
          eq(schema.examResults.studentId, studentId),
        ),
      )
      .limit(1);

    if (!result)
      throw new NotFoundException(
        'Result not found for this student in this exam',
      );

    const subjectMarks = await this.db.db
      .select({
        subjectName: schema.subjects.name,
        marksObtained: schema.marks.marksObtained,
        maxMarks: schema.marks.maxMarks,
        grade: schema.marks.grade,
        isAbsent: schema.marks.isAbsent,
      })
      .from(schema.marks)
      .innerJoin(
        schema.examSchedules,
        eq(schema.examSchedules.id, schema.marks.examScheduleId),
      )
      .leftJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.examSchedules.subjectId),
      )
      .where(
        and(
          eq(schema.marks.studentId, studentId),
          eq(schema.examSchedules.examId, examId),
        ),
      );

    return { ...result, subjects: subjectMarks };
  }

  async findResultsByStudent(
    studentId: string,
    branchId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    const data = await this.db.db
      .select({
        id: schema.examResults.id,
        examName: schema.exams.name,
        examType: schema.exams.examType,
        totalMarks: schema.examResults.totalMarks,
        percentage: schema.examResults.percentage,
        grade: schema.examResults.grade,
        rank: schema.examResults.rank,
        resultStatus: schema.examResults.resultStatus,
      })
      .from(schema.examResults)
      .innerJoin(schema.exams, eq(schema.exams.id, schema.examResults.examId))
      .where(
        and(
          eq(schema.examResults.studentId, studentId),
          eq(schema.exams.branchId, branchId),
        ),
      )
      .orderBy(desc(schema.exams.startDate))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.examResults)
      .innerJoin(schema.exams, eq(schema.exams.id, schema.examResults.examId))
      .where(
        and(
          eq(schema.examResults.studentId, studentId),
          eq(schema.exams.branchId, branchId),
        ),
      );

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  // ─── Subject-wise breakdown ───────────────────────────────────────────────

  async getSubjectMarks(examId: string, studentId: string) {
    await this.findExamById(examId);

    return this.db.db
      .select({
        scheduleId: schema.examSchedules.id,
        subjectName: schema.subjects.name,
        marksObtained: schema.marks.marksObtained,
        maxMarks: schema.examSchedules.maxMarks,
        passMarks: schema.examSchedules.passMarks,
        grade: schema.marks.grade,
        gradePoint: schema.marks.gradePoint,
        isAbsent: schema.marks.isAbsent,
      })
      .from(schema.examSchedules)
      .leftJoin(
        schema.subjects,
        eq(schema.subjects.id, schema.examSchedules.subjectId),
      )
      .leftJoin(
        schema.marks,
        and(
          eq(schema.marks.examScheduleId, schema.examSchedules.id),
          eq(schema.marks.studentId, studentId),
        ),
      )
      .where(eq(schema.examSchedules.examId, examId))
      .orderBy(schema.examSchedules.date);
  }
}
