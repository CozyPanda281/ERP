import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

@Injectable()
export class HomeworkService {
  constructor(private readonly db: DatabaseProvider) {}

  async createHomework(params: {
    tenantId: string;
    branchId: string;
    classId: string;
    sectionId?: string;
    subjectId: string;
    teacherId: string;
    title: string;
    description?: string;
    attachmentUrls?: any[];
    dueDate: string;
    maxMarks?: number;
    isMandatory?: boolean;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.homework)
      .values({ ...params, dueDate: new Date(params.dueDate) })
      .returning({ id: schema.homework.id });
    const [hw] = await this.db.db
      .select()
      .from(schema.homework)
      .where(eq(schema.homework.id, inserted.id))
      .limit(1);
    return hw;
  }

  async findHomeworkByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      classId?: string;
      subjectId?: string;
      teacherId?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.homework.branchId, branchId)];
    if (query?.classId)
      conditions.push(eq(schema.homework.classId, query.classId));
    if (query?.subjectId)
      conditions.push(eq(schema.homework.subjectId, query.subjectId));
    if (query?.teacherId)
      conditions.push(eq(schema.homework.teacherId, query.teacherId));
    const data = await this.db.db
      .select()
      .from(schema.homework)
      .where(and(...conditions))
      .orderBy(desc(schema.homework.dueDate))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.homework)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findHomeworkById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.homework)
      .where(eq(schema.homework.id, id))
      .limit(1);
    if (!result) throw new NotFoundException('Homework not found');
    return result;
  }

  async submitHomework(params: {
    tenantId: string;
    homeworkId: string;
    studentId: string;
    submissionText?: string;
    attachmentUrls?: any[];
    isLate?: boolean;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.homeworkSubmissions)
      .values(params)
      .returning({ id: schema.homeworkSubmissions.id });
    const [sub] = await this.db.db
      .select()
      .from(schema.homeworkSubmissions)
      .where(eq(schema.homeworkSubmissions.id, inserted.id))
      .limit(1);
    return sub;
  }

  async findSubmissionsByHomework(homeworkId: string) {
    return this.db.db
      .select()
      .from(schema.homeworkSubmissions)
      .where(eq(schema.homeworkSubmissions.homeworkId, homeworkId))
      .orderBy(desc(schema.homeworkSubmissions.submittedAt));
  }

  async gradeSubmission(
    id: string,
    marksObtained: string,
    feedback?: string,
    gradedBy?: string,
  ) {
    const [existing] = await this.db.db
      .select({ id: schema.homeworkSubmissions.id })
      .from(schema.homeworkSubmissions)
      .where(eq(schema.homeworkSubmissions.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Submission not found');
    await this.db.db
      .update(schema.homeworkSubmissions)
      .set({
        marksObtained,
        feedback,
        gradedBy,
        gradedAt: new Date(),
        status: 'graded',
        updatedAt: new Date(),
      })
      .where(eq(schema.homeworkSubmissions.id, id));
    const [sub] = await this.db.db
      .select()
      .from(schema.homeworkSubmissions)
      .where(eq(schema.homeworkSubmissions.id, id))
      .limit(1);
    return sub;
  }

  async createAssignment(params: {
    tenantId: string;
    branchId: string;
    classId: string;
    sectionId?: string;
    subjectId: string;
    teacherId: string;
    title: string;
    description?: string;
    assignmentType?: string;
    attachmentUrls?: any[];
    dueDate: string;
    maxMarks?: number;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.assignments)
      .values({ ...params, dueDate: new Date(params.dueDate) })
      .returning({ id: schema.assignments.id });
    const [asg] = await this.db.db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, inserted.id))
      .limit(1);
    return asg;
  }

  async findAssignmentsByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      classId?: string;
      subjectId?: string;
      teacherId?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.assignments.branchId, branchId)];
    if (query?.classId)
      conditions.push(eq(schema.assignments.classId, query.classId));
    if (query?.subjectId)
      conditions.push(eq(schema.assignments.subjectId, query.subjectId));
    if (query?.teacherId)
      conditions.push(eq(schema.assignments.teacherId, query.teacherId));
    const data = await this.db.db
      .select()
      .from(schema.assignments)
      .where(and(...conditions))
      .orderBy(desc(schema.assignments.dueDate))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.assignments)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async submitAssignment(params: {
    tenantId: string;
    assignmentId: string;
    studentId: string;
    submissionText?: string;
    attachmentUrls?: any[];
    isLate?: boolean;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.assignmentSubmissions)
      .values(params)
      .returning({ id: schema.assignmentSubmissions.id });
    const [sub] = await this.db.db
      .select()
      .from(schema.assignmentSubmissions)
      .where(eq(schema.assignmentSubmissions.id, inserted.id))
      .limit(1);
    return sub;
  }

  async findAssignmentSubmissions(assignmentId: string) {
    return this.db.db
      .select()
      .from(schema.assignmentSubmissions)
      .where(eq(schema.assignmentSubmissions.assignmentId, assignmentId))
      .orderBy(desc(schema.assignmentSubmissions.submittedAt));
  }

  async gradeAssignmentSubmission(
    id: string,
    marksObtained: string,
    feedback?: string,
    gradedBy?: string,
  ) {
    const [existing] = await this.db.db
      .select({ id: schema.assignmentSubmissions.id })
      .from(schema.assignmentSubmissions)
      .where(eq(schema.assignmentSubmissions.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Submission not found');
    await this.db.db
      .update(schema.assignmentSubmissions)
      .set({
        marksObtained,
        feedback,
        gradedBy,
        gradedAt: new Date(),
        status: 'graded',
        updatedAt: new Date(),
      })
      .where(eq(schema.assignmentSubmissions.id, id));
    const [sub] = await this.db.db
      .select()
      .from(schema.assignmentSubmissions)
      .where(eq(schema.assignmentSubmissions.id, id))
      .limit(1);
    return sub;
  }
}
