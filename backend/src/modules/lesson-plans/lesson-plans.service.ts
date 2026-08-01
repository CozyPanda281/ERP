import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count } from 'drizzle-orm';

@Injectable()
export class LessonPlansService {
  constructor(private readonly db: DatabaseProvider) {}

  async create(params: {
    tenantId: string;
    branchId: string;
    teacherId: string;
    subjectId: string;
    classId: string;
    sectionId?: string;
    title: string;
    objectives?: string;
    content?: string;
    teachingMethod?: string;
    resources?: string;
    durationMinutes?: number;
    date?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.lessonPlans)
      .values(params)
      .returning({ id: schema.lessonPlans.id });
    const [lp] = await this.db.db
      .select()
      .from(schema.lessonPlans)
      .where(eq(schema.lessonPlans.id, inserted.id))
      .limit(1);
    return lp;
  }

  async findByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      teacherId?: string;
      subjectId?: string;
      classId?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.lessonPlans.branchId, branchId)];
    if (query?.teacherId)
      conditions.push(eq(schema.lessonPlans.teacherId, query.teacherId));
    if (query?.subjectId)
      conditions.push(eq(schema.lessonPlans.subjectId, query.subjectId));
    if (query?.classId)
      conditions.push(eq(schema.lessonPlans.classId, query.classId));
    const data = await this.db.db
      .select()
      .from(schema.lessonPlans)
      .where(and(...conditions))
      .orderBy(desc(schema.lessonPlans.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.lessonPlans)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.lessonPlans)
      .where(eq(schema.lessonPlans.id, id))
      .limit(1);
    if (!result) throw new NotFoundException('Lesson plan not found');
    return result;
  }

  async update(
    id: string,
    params: {
      title?: string;
      objectives?: string;
      content?: string;
      teachingMethod?: string;
      resources?: string;
      durationMinutes?: number;
      date?: string;
      status?: string;
    },
  ) {
    await this.findById(id);
    const values: any = { ...params, updatedAt: new Date() };
    Object.keys(params).forEach((k) => {
      if (params[k as keyof typeof params] === undefined) delete values[k];
    });
    if (Object.keys(values).length > 1)
      await this.db.db
        .update(schema.lessonPlans)
        .set(values)
        .where(eq(schema.lessonPlans.id, id));
    return this.findById(id);
  }

  async delete(id: string) {
    await this.findById(id);
    await this.db.db
      .update(schema.lessonPlans)
      .set({ status: 'deleted' })
      .where(eq(schema.lessonPlans.id, id));
    return { success: true };
  }
}
