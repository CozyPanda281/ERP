import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql, isNull } from 'drizzle-orm';

@Injectable()
export class StaffService {
  constructor(private readonly db: DatabaseProvider) {}

  async create(params: { tenantId: string; branchId: string; employeeCode: string; firstName: string; lastName: string; email?: string; phone?: string; gender?: string; dateOfBirth?: string; address?: string; city?: string; state?: string; pincode?: string; qualification?: string; experienceYears?: string; joiningDate?: string; employmentType?: string; designation?: string; departmentId?: string; basicSalary?: string; isTeaching?: boolean; bankName?: string; bankAccountNo?: string; ifscCode?: string; panNumber?: string; aadharNumber?: string; profilePhotoUrl?: string; userId?: string }) {
    const [inserted] = await this.db.db.insert(schema.staff).values({
      tenantId: params.tenantId, branchId: params.branchId, employeeCode: params.employeeCode,
      firstName: params.firstName, lastName: params.lastName, email: params.email, phone: params.phone,
      gender: params.gender, dateOfBirth: params.dateOfBirth, address: params.address, city: params.city,
      state: params.state, pincode: params.pincode, qualification: params.qualification,
      experienceYears: params.experienceYears, joiningDate: params.joiningDate,
      employmentType: params.employmentType ?? 'permanent', designation: params.designation,
      departmentId: params.departmentId, basicSalary: params.basicSalary, isTeaching: params.isTeaching ?? false,
      bankName: params.bankName, bankAccountNo: params.bankAccountNo, ifscCode: params.ifscCode,
      panNumber: params.panNumber, aadharNumber: params.aadharNumber, profilePhotoUrl: params.profilePhotoUrl,
      userId: params.userId,
    }).returning({ id: schema.staff.id });
    return this.findById(inserted.id);
  }

  async findByBranch(branchId: string, query?: { page?: number; limit?: number; departmentId?: string; isTeaching?: boolean; search?: string }) {
    const page = query?.page || 1; const limit = Math.min(query?.limit || 20, 100); const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.staff.branchId, branchId), isNull(schema.staff.deletedAt)];
    if (query?.departmentId) conditions.push(eq(schema.staff.departmentId, query.departmentId));
    if (query?.isTeaching !== undefined) conditions.push(eq(schema.staff.isTeaching, query.isTeaching));
    if (query?.search) conditions.push(sql`(${schema.staff.firstName}::text ILIKE ${'%' + query.search + '%'} OR ${schema.staff.lastName}::text ILIKE ${'%' + query.search + '%'} OR ${schema.staff.employeeCode}::text ILIKE ${'%' + query.search + '%'})`);
    const data = await this.db.db.select().from(schema.staff).where(and(...conditions)).orderBy(desc(schema.staff.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.staff).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findById(id: string) {
    const [result] = await this.db.db.select().from(schema.staff).where(and(eq(schema.staff.id, id), isNull(schema.staff.deletedAt))).limit(1);
    if (!result) throw new NotFoundException('Staff not found');
    return result;
  }

  async update(id: string, params: { firstName?: string; lastName?: string; email?: string; phone?: string; gender?: string; dateOfBirth?: string; address?: string; city?: string; state?: string; pincode?: string; qualification?: string; experienceYears?: string; joiningDate?: string; employmentType?: string; designation?: string; departmentId?: string; basicSalary?: string; isTeaching?: boolean; bankName?: string; bankAccountNo?: string; ifscCode?: string; panNumber?: string; aadharNumber?: string; profilePhotoUrl?: string; isActive?: boolean; status?: string }) {
    await this.findById(id);
    const values: any = { ...params, updatedAt: new Date() };
    Object.keys(params).forEach(k => { if (params[k as keyof typeof params] === undefined) delete values[k]; });
    if (Object.keys(values).length > 1) await this.db.db.update(schema.staff).set(values).where(eq(schema.staff.id, id));
    return this.findById(id);
  }

  async delete(id: string) {
    await this.findById(id);
    await this.db.db.update(schema.staff).set({ deletedAt: new Date() }).where(eq(schema.staff.id, id));
    return { success: true };
  }

  async addDocument(params: { tenantId: string; staffId: string; documentType: string; documentNumber?: string; fileUrl: string }) {
    const [inserted] = await this.db.db.insert(schema.staffDocuments).values({ tenantId: params.tenantId, staffId: params.staffId, documentType: params.documentType, documentNumber: params.documentNumber, fileUrl: params.fileUrl }).returning({ id: schema.staffDocuments.id });
    const [doc] = await this.db.db.select().from(schema.staffDocuments).where(eq(schema.staffDocuments.id, inserted.id)).limit(1);
    return doc;
  }

  async findDocumentsByStaff(staffId: string) {
    return this.db.db.select().from(schema.staffDocuments).where(eq(schema.staffDocuments.staffId, staffId)).orderBy(desc(schema.staffDocuments.createdAt));
  }
}
