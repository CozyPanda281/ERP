import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '../../database/schema';
import { eq, and, isNull } from 'drizzle-orm';

@Injectable()
export class AcademicService {
  constructor(private readonly db: DatabaseProvider) {}

  // ─── Academic Years ──────────────────────────────────────────────────────

  async createAcademicYear(params: {
    tenantId: string;
    branchId: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  }) {
    const existing = await this.db.db
      .select({ id: schema.academicYears.id })
      .from(schema.academicYears)
      .where(
        and(
          eq(schema.academicYears.tenantId, params.tenantId),
          eq(schema.academicYears.branchId, params.branchId),
          eq(schema.academicYears.name, params.name),
        ),
      )
      .limit(1);
    if (existing.length)
      throw new ConflictException(
        'Academic year with this name already exists',
      );

    if (params.isCurrent) {
      await this.db.db
        .update(schema.academicYears)
        .set({ isCurrent: false })
        .where(
          and(
            eq(schema.academicYears.tenantId, params.tenantId),
            eq(schema.academicYears.branchId, params.branchId),
          ),
        );
    }

    const id = uuidv4();
    await this.db.db.insert(schema.academicYears).values({
      id,
      tenantId: params.tenantId,
      branchId: params.branchId,
      name: params.name,
      startDate: params.startDate,
      endDate: params.endDate,
      isCurrent: params.isCurrent || false,
    });
    return this.findAcademicYearById(id, params.tenantId);
  }

  async findAcademicYearById(id: string, tenantId?: string) {
    const conditions: any[] = [eq(schema.academicYears.id, id)];
    if (tenantId) conditions.push(eq(schema.academicYears.tenantId, tenantId));

    const result = await this.db.db
      .select()
      .from(schema.academicYears)
      .where(and(...conditions))
      .limit(1);
    if (!result.length) throw new NotFoundException('Academic year not found');
    return result[0];
  }

  async findAcademicYearsByBranch(branchId: string) {
    const result = await this.db.db
      .select()
      .from(schema.academicYears)
      .where(eq(schema.academicYears.branchId, branchId))
      .orderBy(schema.academicYears.startDate);
    return result;
  }

  async setCurrentAcademicYear(id: string, tenantId: string, branchId: string) {
    await this.findAcademicYearById(id);
    await this.db.db
      .update(schema.academicYears)
      .set({ isCurrent: false })
      .where(
        and(
          eq(schema.academicYears.tenantId, tenantId),
          eq(schema.academicYears.branchId, branchId),
        ),
      );
    await this.db.db
      .update(schema.academicYears)
      .set({ isCurrent: true })
      .where(eq(schema.academicYears.id, id));
    return this.findAcademicYearById(id);
  }

  // ─── Departments ─────────────────────────────────────────────────────────

  async createDepartment(params: {
    tenantId: string;
    branchId: string;
    name: string;
    code?: string;
    description?: string;
    hodId?: string;
  }) {
    const existing = await this.db.db
      .select({ id: schema.departments.id })
      .from(schema.departments)
      .where(
        and(
          eq(schema.departments.tenantId, params.tenantId),
          eq(schema.departments.branchId, params.branchId),
          eq(schema.departments.name, params.name),
          isNull(schema.departments.deletedAt),
        ),
      )
      .limit(1);
    if (existing.length)
      throw new ConflictException('Department with this name already exists');

    const id = uuidv4();
    await this.db.db.insert(schema.departments).values({
      id,
      tenantId: params.tenantId,
      branchId: params.branchId,
      name: params.name,
      code: params.code,
      description: params.description,
      hodId: params.hodId,
    });
    return this.findDepartmentById(id, params.branchId);
  }

  async findDepartmentById(id: string, branchId?: string) {
    const conditions: any[] = [
      eq(schema.departments.id, id),
      isNull(schema.departments.deletedAt),
    ];
    if (branchId) conditions.push(eq(schema.departments.branchId, branchId));

    const result = await this.db.db
      .select()
      .from(schema.departments)
      .where(and(...conditions))
      .limit(1);
    if (!result.length) throw new NotFoundException('Department not found');
    return result[0];
  }

  async findDepartmentsByBranch(branchId: string) {
    const result = await this.db.db
      .select()
      .from(schema.departments)
      .where(
        and(
          eq(schema.departments.branchId, branchId),
          isNull(schema.departments.deletedAt),
        ),
      )
      .orderBy(schema.departments.name);
    return result;
  }

  async updateDepartment(
    id: string,
    params: Partial<{
      name: string;
      code: string;
      description: string;
      hodId: string;
    }>,
  ) {
    await this.findDepartmentById(id);
    const values: any = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        values[key] = value;
      }
    }
    if (Object.keys(values).length === 0) return this.findDepartmentById(id);
    await this.db.db
      .update(schema.departments)
      .set(values)
      .where(eq(schema.departments.id, id));
    return this.findDepartmentById(id);
  }

  async deleteDepartment(id: string) {
    await this.findDepartmentById(id);
    await this.db.db
      .update(schema.departments)
      .set({ deletedAt: new Date() })
      .where(eq(schema.departments.id, id));
  }

  // ─── Classes ─────────────────────────────────────────────────────────────

  async createClass(params: {
    tenantId: string;
    branchId: string;
    name: string;
    code?: string;
    description?: string;
    displayOrder?: number;
  }) {
    const existing = await this.db.db
      .select({ id: schema.classes.id })
      .from(schema.classes)
      .where(
        and(
          eq(schema.classes.tenantId, params.tenantId),
          eq(schema.classes.branchId, params.branchId),
          eq(schema.classes.name, params.name),
          isNull(schema.classes.deletedAt),
        ),
      )
      .limit(1);
    if (existing.length)
      throw new ConflictException('Class with this name already exists');

    const id = uuidv4();
    await this.db.db.insert(schema.classes).values({
      id,
      tenantId: params.tenantId,
      branchId: params.branchId,
      name: params.name,
      code: params.code,
      description: params.description,
      displayOrder: params.displayOrder || 0,
    });
    return this.findClassById(id, params.branchId);
  }

  async findClassById(id: string, branchId?: string) {
    const conditions: any[] = [
      eq(schema.classes.id, id),
      isNull(schema.classes.deletedAt),
    ];
    if (branchId) conditions.push(eq(schema.classes.branchId, branchId));

    const result = await this.db.db
      .select()
      .from(schema.classes)
      .where(and(...conditions))
      .limit(1);
    if (!result.length) throw new NotFoundException('Class not found');
    return result[0];
  }

  async findClassesByBranch(branchId: string) {
    const result = await this.db.db
      .select()
      .from(schema.classes)
      .where(
        and(
          eq(schema.classes.branchId, branchId),
          isNull(schema.classes.deletedAt),
        ),
      )
      .orderBy(schema.classes.displayOrder, schema.classes.name);
    return result;
  }

  async updateClass(
    id: string,
    params: Partial<{
      name: string;
      code: string;
      description: string;
      displayOrder: number;
    }>,
  ) {
    await this.findClassById(id);
    const values: any = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        values[key] = value;
      }
    }
    if (Object.keys(values).length === 0) return this.findClassById(id);
    await this.db.db
      .update(schema.classes)
      .set(values)
      .where(eq(schema.classes.id, id));
    return this.findClassById(id);
  }

  async deleteClass(id: string) {
    await this.findClassById(id);
    await this.db.db
      .update(schema.classes)
      .set({ deletedAt: new Date() })
      .where(eq(schema.classes.id, id));
  }

  // ─── Sections ────────────────────────────────────────────────────────────

  async createSection(params: {
    tenantId: string;
    branchId: string;
    classId: string;
    name: string;
    code?: string;
    capacity?: number;
    roomNumber?: string;
  }) {
    const existing = await this.db.db
      .select({ id: schema.sections.id })
      .from(schema.sections)
      .where(
        and(
          eq(schema.sections.tenantId, params.tenantId),
          eq(schema.sections.branchId, params.branchId),
          eq(schema.sections.classId, params.classId),
          eq(schema.sections.name, params.name),
          isNull(schema.sections.deletedAt),
        ),
      )
      .limit(1);
    if (existing.length)
      throw new ConflictException('Section with this name already exists in this class');

    const id = uuidv4();
    await this.db.db.insert(schema.sections).values({
      id,
      tenantId: params.tenantId,
      branchId: params.branchId,
      classId: params.classId,
      name: params.name,
      code: params.code,
      capacity: params.capacity || 0,
      roomNumber: params.roomNumber,
    });
    return this.findSectionById(id, params.branchId);
  }

  async findSectionById(id: string, branchId?: string) {
    const conditions: any[] = [
      eq(schema.sections.id, id),
      isNull(schema.sections.deletedAt),
    ];
    if (branchId) conditions.push(eq(schema.sections.branchId, branchId));

    const result = await this.db.db
      .select()
      .from(schema.sections)
      .where(and(...conditions))
      .limit(1);
    if (!result.length) throw new NotFoundException('Section not found');
    return result[0];
  }

  async findSectionsByClass(classId: string) {
    const result = await this.db.db
      .select()
      .from(schema.sections)
      .where(
        and(
          eq(schema.sections.classId, classId),
          isNull(schema.sections.deletedAt),
        ),
      )
      .orderBy(schema.sections.name);
    return result;
  }

  // ─── Subjects ────────────────────────────────────────────────────────────

  async createSubject(params: {
    tenantId: string;
    branchId: string;
    name: string;
    code?: string;
    subjectType?: string;
    isLanguage?: boolean;
    description?: string;
  }) {
    const conditions: any[] = [
      eq(schema.subjects.tenantId, params.tenantId),
      eq(schema.subjects.branchId, params.branchId),
      isNull(schema.subjects.deletedAt),
    ];
    if (params.code !== undefined) {
      conditions.push(eq(schema.subjects.code, params.code));
    }
    const existing = await this.db.db
      .select({ id: schema.subjects.id })
      .from(schema.subjects)
      .where(and(...conditions))
      .limit(1);
    if (existing.length)
      throw new ConflictException('Subject with this code already exists');

    const id = uuidv4();
    await this.db.db.insert(schema.subjects).values({
      id,
      tenantId: params.tenantId,
      branchId: params.branchId,
      name: params.name,
      code: params.code,
      subjectType: params.subjectType || 'theory',
      isLanguage: params.isLanguage || false,
      description: params.description,
    });
    return this.findSubjectById(id, params.branchId);
  }

  async findSubjectById(id: string, branchId?: string) {
    const conditions: any[] = [
      eq(schema.subjects.id, id),
      isNull(schema.subjects.deletedAt),
    ];
    if (branchId) conditions.push(eq(schema.subjects.branchId, branchId));

    const result = await this.db.db
      .select()
      .from(schema.subjects)
      .where(and(...conditions))
      .limit(1);
    if (!result.length) throw new NotFoundException('Subject not found');
    return result[0];
  }

  async findSubjectsByBranch(branchId: string) {
    const result = await this.db.db
      .select()
      .from(schema.subjects)
      .where(
        and(
          eq(schema.subjects.branchId, branchId),
          isNull(schema.subjects.deletedAt),
        ),
      )
      .orderBy(schema.subjects.name);
    return result;
  }
}
