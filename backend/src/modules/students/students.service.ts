import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '../../database/schema';
import { eq, and, isNull, or, ilike, desc, asc, count, sql, inArray } from 'drizzle-orm';

@Injectable()
export class StudentsService {
  constructor(
    private readonly db: DatabaseProvider,
    private readonly crypto: CryptoService,
  ) {}

  private encrypt(val?: string | null): string | undefined {
    return val ? this.crypto.encrypt(val) : undefined;
  }

  private decryptRow<T extends Record<string, any>>(row: T, fields: (keyof T)[]): T {
    if (!row) return row;
    for (const field of fields) {
      if (row[field]) {
        try { (row as any)[field] = this.crypto.decrypt(row[field] as string); } catch { (row as any)[field] = null; }
      }
    }
    return row;
  }

  // ─── Enquiries ────────────────────────────────────────────────────────────

  async createEnquiry(params: {
    tenantId: string; branchId: string;
    studentName: string; dateOfBirth?: string; gender?: string;
    parentName?: string; parentPhone?: string; parentEmail?: string;
    address?: string; classId?: string; academicYearId?: string;
    source?: string; remarks?: string; followUpDate?: string;
  }) {
    const [inserted] = await this.db.db.insert(schema.enquiries).values({
      tenantId: params.tenantId, branchId: params.branchId,
      studentName: params.studentName, dateOfBirth: params.dateOfBirth,
      gender: params.gender, parentName: params.parentName,
      parentPhone: this.encrypt(params.parentPhone), parentEmail: this.encrypt(params.parentEmail),
      address: params.address, classId: params.classId,
      academicYearId: params.academicYearId, source: params.source,
      remarks: params.remarks, followUpDate: params.followUpDate,
    }).returning({ id: schema.enquiries.id });
    return this.decryptRow(await this.findEnquiryById(inserted.id, params.branchId), ['parentPhone', 'parentEmail']);
  }

  async findEnquiryById(id: string, branchId?: string) {
    const conditions: any[] = [eq(schema.enquiries.id, id)];
    if (branchId) conditions.push(eq(schema.enquiries.branchId, branchId));

    const [result] = await this.db.db.select().from(schema.enquiries).where(and(...conditions)).limit(1);
    if (!result) throw new NotFoundException('Enquiry not found');
    return this.decryptRow(result, ['parentPhone', 'parentEmail']);
  }

  async findEnquiriesByBranch(branchId: string, query: { page?: number; limit?: number; status?: string; search?: string; fromDate?: string; toDate?: string }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.enquiries.branchId, branchId)];
    if (query.status) conditions.push(eq(schema.enquiries.status, query.status));
    if (query.search) conditions.push(ilike(schema.enquiries.studentName, `%${query.search}%`));
    if (query.fromDate) conditions.push(sql`${schema.enquiries.createdAt} >= ${query.fromDate}::date`);
    if (query.toDate) conditions.push(sql`${schema.enquiries.createdAt} <= ${query.toDate}::date`);

    const data = await this.db.db.select().from(schema.enquiries).where(and(...conditions)).orderBy(desc(schema.enquiries.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.enquiries).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async updateEnquiry(id: string, params: any) {
    await this.findEnquiryById(id);
    const allowed: any = { updatedAt: new Date() };
    for (const key of ['studentName', 'dateOfBirth', 'gender', 'parentName', 'parentPhone', 'parentEmail', 'address', 'classId', 'academicYearId', 'source', 'remarks', 'followUpDate', 'status', 'remarks']) {
      if (params[key] !== undefined) allowed[key] = params[key];
    }
    await this.db.db.update(schema.enquiries).set(allowed).where(eq(schema.enquiries.id, id));
    return this.findEnquiryById(id);
  }

  async convertEnquiryToApplication(id: string) {
    const enquiry = await this.findEnquiryById(id);
    if (enquiry.convertedToApplication) throw new ConflictException('Enquiry already converted');

    const appNo = await this.generateApplicationNumber(enquiry.tenantId, enquiry.branchId);
    const insertData: any = {
      tenantId: enquiry.tenantId,
      branchId: enquiry.branchId,
      applicationNumber: appNo,
      enquiryId: id,
      studentFirstName: enquiry.studentName || '',
      studentLastName: '',
    };
    if (enquiry.classId) insertData.classId = enquiry.classId;
    if (enquiry.academicYearId) insertData.academicYearId = enquiry.academicYearId;
    const [insertedApp] = await this.db.db.insert(schema.applications).values(insertData).returning({ id: schema.applications.id });

    await this.db.db.update(schema.enquiries).set({ convertedToApplication: true, updatedAt: new Date() }).where(eq(schema.enquiries.id, id));
    return this.findApplicationById(insertedApp.id, enquiry.branchId);
  }

  // ─── Applications ─────────────────────────────────────────────────────────

  private async generateApplicationNumber(tenantId: string, branchId: string): Promise<string> {
    const [result] = await this.db.db.select({ count: count() }).from(schema.applications).where(and(eq(schema.applications.tenantId, tenantId), eq(schema.applications.branchId, branchId)));
    return `APP-${(Number(result.count) + 1).toString().padStart(5, '0')}`;
  }

  async createApplication(params: {
    tenantId: string; branchId: string;
    enquiryId?: string; studentFirstName: string; studentLastName: string;
    dateOfBirth?: string; gender?: string; nationality?: string;
    religion?: string; caste?: string; category?: string;
    address?: string; city?: string; state?: string; pincode?: string;
    phone?: string; email?: string; bloodGroup?: string;
    fatherName?: string; fatherPhone?: string; fatherEmail?: string; fatherOccupation?: string;
    motherName?: string; motherPhone?: string; motherEmail?: string; motherOccupation?: string;
    guardianName?: string; guardianRelation?: string; guardianPhone?: string;
    previousSchool?: string; previousClass?: string;
    classId: string; academicYearId: string;
  }) {
    const applicationNumber = await this.generateApplicationNumber(params.tenantId, params.branchId);
    const encrypted = { ...params, applicationNumber };
    if (encrypted.phone) encrypted.phone = this.encrypt(encrypted.phone);
    if (encrypted.email) encrypted.email = this.encrypt(encrypted.email);
    if (encrypted.fatherPhone) encrypted.fatherPhone = this.encrypt(encrypted.fatherPhone);
    if (encrypted.fatherEmail) encrypted.fatherEmail = this.encrypt(encrypted.fatherEmail);
    if (encrypted.motherPhone) encrypted.motherPhone = this.encrypt(encrypted.motherPhone);
    if (encrypted.motherEmail) encrypted.motherEmail = this.encrypt(encrypted.motherEmail);
    if (encrypted.guardianPhone) encrypted.guardianPhone = this.encrypt(encrypted.guardianPhone);
    const [inserted] = await this.db.db.insert(schema.applications).values(encrypted as any).returning({ id: schema.applications.id });
    return this.decryptRow(await this.findApplicationById(inserted.id, params.branchId), ['phone', 'email', 'fatherPhone', 'fatherEmail', 'motherPhone', 'motherEmail', 'guardianPhone']);
  }

  async findApplicationById(id: string, branchId?: string) {
    const conditions: any[] = [eq(schema.applications.id, id)];
    if (branchId) conditions.push(eq(schema.applications.branchId, branchId));

    const [result] = await this.db.db.select().from(schema.applications).where(and(...conditions)).limit(1);
    if (!result) throw new NotFoundException('Application not found');
    return this.decryptRow(result, ['phone', 'email', 'fatherPhone', 'fatherEmail', 'motherPhone', 'motherEmail', 'guardianPhone']);
  }

  async findApplicationsByBranch(branchId: string, query: { page?: number; limit?: number; status?: string; classId?: string; fromDate?: string; toDate?: string }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.applications.branchId, branchId)];
    if (query.status) conditions.push(eq(schema.applications.status, query.status));
    if (query.classId) conditions.push(eq(schema.applications.classId, query.classId));
    if (query.fromDate) conditions.push(sql`${schema.applications.createdAt} >= ${query.fromDate}::date`);
    if (query.toDate) conditions.push(sql`${schema.applications.createdAt} <= ${query.toDate}::date`);

    const data = await this.db.db.select().from(schema.applications).where(and(...conditions)).orderBy(desc(schema.applications.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.applications).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async updateApplication(id: string, params: any) {
    await this.findApplicationById(id);
    const allowed: any = { updatedAt: new Date() };
    for (const key of ['studentFirstName', 'studentLastName', 'dateOfBirth', 'gender', 'nationality', 'religion', 'caste', 'category', 'address', 'city', 'state', 'pincode', 'phone', 'email', 'bloodGroup', 'fatherName', 'fatherPhone', 'fatherEmail', 'fatherOccupation', 'motherName', 'motherPhone', 'motherEmail', 'motherOccupation', 'guardianName', 'guardianRelation', 'guardianPhone', 'previousSchool', 'previousClass', 'classId', 'academicYearId']) {
      if (params[key] !== undefined) allowed[key] = params[key];
    }
    await this.db.db.update(schema.applications).set(allowed).where(eq(schema.applications.id, id));
    return this.findApplicationById(id);
  }

  async reviewApplication(id: string, status: string, reviewRemarks: string | undefined, reviewedBy: string) {
    const app = await this.findApplicationById(id);
    if (app.status !== 'pending') throw new BadRequestException('Application already reviewed');
    await this.db.db.update(schema.applications).set({
      status, reviewRemarks: reviewRemarks || null, reviewedBy, reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(schema.applications.id, id));
    return this.findApplicationById(id);
  }

  async admitApplication(id: string) {
    const app = await this.findApplicationById(id);
    if (app.status !== 'approved') throw new BadRequestException('Application must be approved first');
    if (app.admitted) throw new ConflictException('Application already admitted');

    const admissionNumber = await this.generateAdmissionNumber(app.tenantId, app.branchId);

    let studentId: string;
    await this.db.db.transaction(async (tx) => {
      const [studentInserted] = await tx.insert(schema.students).values({
        tenantId: app.tenantId, branchId: app.branchId,
        admissionNumber, applicationId: id,
        firstName: app.studentFirstName, lastName: app.studentLastName,
        dateOfBirth: app.dateOfBirth, gender: app.gender,
        nationality: app.nationality, religion: app.religion,
        caste: app.caste, category: app.category,
        address: app.address, city: app.city, state: app.state, pincode: app.pincode,
        phone: app.phone, email: app.email, bloodGroup: app.bloodGroup,
        admissionDate: new Date().toISOString().split('T')[0],
      } as any).returning({ id: schema.students.id });
      studentId = studentInserted.id;

      await tx.insert(schema.studentAcademicRecords).values({
        tenantId: app.tenantId, branchId: app.branchId,
        studentId, classId: app.classId, academicYearId: app.academicYearId,
      } as any);

      await tx.update(schema.applications).set({ admitted: true, status: 'admitted', updatedAt: new Date() } as any).where(eq(schema.applications.id, id));
    });

    return this.findStudentById(studentId!, app.branchId);
  }

  // ─── Students ─────────────────────────────────────────────────────────────

  private async generateAdmissionNumber(tenantId: string, branchId: string): Promise<string> {
    const [result] = await this.db.db.select({ count: count() }).from(schema.students).where(and(eq(schema.students.tenantId, tenantId), eq(schema.students.branchId, branchId)));
    return `STD-${(Number(result.count) + 1).toString().padStart(5, '0')}`;
  }

  async createStudent(params: {
    tenantId: string; branchId: string;
    firstName: string; middleName?: string; lastName: string;
    dateOfBirth?: string; gender?: string; bloodGroup?: string;
    nationality?: string; religion?: string; caste?: string; category?: string;
    address?: string; city?: string; state?: string; pincode?: string;
    phone?: string; email?: string;
    classId?: string; sectionId?: string; academicYearId?: string;
    admissionDate?: string;
  }) {
    const admissionNumber = await this.generateAdmissionNumber(params.tenantId, params.branchId);
    const encPhone = this.encrypt(params.phone);
    const encEmail = this.encrypt(params.email);
    const [inserted] = await this.db.db.insert(schema.students).values({
      tenantId: params.tenantId, branchId: params.branchId,
      admissionNumber, firstName: params.firstName, middleName: params.middleName,
      lastName: params.lastName, dateOfBirth: params.dateOfBirth,
      gender: params.gender, bloodGroup: params.bloodGroup,
      nationality: params.nationality, religion: params.religion,
      caste: params.caste, category: params.category,
      address: params.address, city: params.city, state: params.state, pincode: params.pincode,
      phone: encPhone, email: encEmail,
      admissionDate: params.admissionDate || new Date().toISOString().split('T')[0],
    }).returning({ id: schema.students.id });
    const studentId = inserted.id;

    if (params.classId && params.academicYearId) {
      await this.db.db.insert(schema.studentAcademicRecords).values({
        tenantId: params.tenantId, branchId: params.branchId,
        studentId, classId: params.classId, sectionId: params.sectionId,
        academicYearId: params.academicYearId,
      });
    }

    return this.decryptRow(await this.findStudentById(studentId!, params.branchId), ['phone', 'email']);
  }

  async findStudentById(id: string, branchId?: string) {
    const conditions: any[] = [eq(schema.students.id, id), isNull(schema.students.deletedAt)];
    if (branchId) conditions.push(eq(schema.students.branchId, branchId));

    const [result] = await this.db.db.select().from(schema.students).where(and(...conditions)).limit(1);
    if (!result) throw new NotFoundException('Student not found');
    return this.decryptRow(result, ['phone', 'email']);
  }

  async findStudentsByBranch(branchId: string, query: { page?: number; limit?: number; search?: string; classId?: string; sectionId?: string; status?: string; gender?: string }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.students.branchId, branchId), isNull(schema.students.deletedAt)];
    if (query.search) conditions.push(or(ilike(schema.students.firstName, `%${query.search}%`), ilike(schema.students.lastName, `%${query.search}%`), ilike(schema.students.admissionNumber, `%${query.search}%`)));
    if (query.status) conditions.push(eq(schema.students.status, query.status));
    if (query.gender) conditions.push(eq(schema.students.gender, query.gender));

    const data = await this.db.db.select().from(schema.students).where(and(...conditions)).orderBy(desc(schema.students.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.students).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async updateStudent(id: string, params: any) {
    await this.findStudentById(id);
    const allowed: any = { updatedAt: new Date() };
    for (const key of ['firstName', 'middleName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup', 'nationality', 'religion', 'caste', 'category', 'address', 'city', 'state', 'pincode', 'phone', 'email', 'rollNumber', 'isActive', 'status']) {
      if (params[key] !== undefined) allowed[key] = params[key];
    }
    await this.db.db.update(schema.students).set(allowed).where(eq(schema.students.id, id));
    return this.findStudentById(id);
  }

  async withdrawStudent(id: string, leavingDate: string, leavingReason?: string) {
    const student = await this.findStudentById(id);
    if (student.status === 'left') throw new BadRequestException('Student already withdrawn');
    await this.db.db.update(schema.students).set({
      status: 'left', leavingDate, leavingReason: leavingReason || null,
      isActive: false, updatedAt: new Date(),
    }).where(eq(schema.students.id, id));
    return this.findStudentById(id);
  }

  async getStudentDocuments(studentId: string) {
    await this.findStudentById(studentId);
    return this.db.db.select().from(schema.studentDocuments).where(eq(schema.studentDocuments.studentId, studentId)).orderBy(desc(schema.studentDocuments.createdAt));
  }

  async getStudentAcademicRecords(studentId: string) {
    await this.findStudentById(studentId);
    const records = await this.db.db.select().from(schema.studentAcademicRecords)
      .where(eq(schema.studentAcademicRecords.studentId, studentId))
      .orderBy(desc(schema.studentAcademicRecords.createdAt));
    return records;
  }

  // ─── Parents ──────────────────────────────────────────────────────────────

  async createParent(params: { tenantId: string; name: string; relationship: string; phone?: string; email?: string; occupation?: string; income?: number; address?: string; isPrimary?: boolean }) {
    const [inserted] = await this.db.db.insert(schema.parents).values({
      tenantId: params.tenantId,
      name: params.name,
      relationship: params.relationship,
      phone: this.encrypt(params.phone),
      email: this.encrypt(params.email),
      occupation: params.occupation,
      income: params.income ? String(params.income) : null,
      address: params.address,
      isPrimary: params.isPrimary,
    }).returning({ id: schema.parents.id });
    return this.findParentById(inserted.id, params.tenantId);
  }

  async findParentById(id: string, tenantId?: string) {
    const conditions: any[] = [eq(schema.parents.id, id)];
    if (tenantId) conditions.push(eq(schema.parents.tenantId, tenantId));

    const [result] = await this.db.db.select().from(schema.parents).where(and(...conditions)).limit(1);
    if (!result) throw new NotFoundException('Parent not found');
    return this.decryptRow(result, ['phone', 'email']);
  }

  async updateParent(id: string, params: any) {
    await this.findParentById(id);
    const allowed: any = { updatedAt: new Date() };
    for (const key of ['name', 'relationship', 'phone', 'email', 'occupation', 'income', 'address', 'isPrimary']) {
      if (params[key] !== undefined) allowed[key] = params[key];
    }
    if (allowed.income !== undefined) allowed.income = String(params.income);
    await this.db.db.update(schema.parents).set(allowed).where(eq(schema.parents.id, id));
    return this.findParentById(id);
  }

  async linkParentToStudent(studentId: string, parentId: string, relationship: string, isPrimary?: boolean, isEmergencyContact?: boolean) {
    await this.findStudentById(studentId);
    await this.findParentById(parentId);
    const [inserted] = await this.db.db.insert(schema.studentParents).values({
      studentId, parentId, relationship, isPrimary: isPrimary || false, isEmergencyContact: isEmergencyContact || false,
    }).returning({ id: schema.studentParents.id });
    return inserted;
  }

  async getStudentParents(studentId: string) {
    await this.findStudentById(studentId);
    return this.db.db.select({
      id: schema.parents.id, name: schema.parents.name, relationship: schema.parents.relationship,
      phone: schema.parents.phone, email: schema.parents.email, occupation: schema.parents.occupation,
      isPrimary: schema.parents.isPrimary, studentRelationship: schema.studentParents.relationship,
      isEmergencyContact: schema.studentParents.isEmergencyContact,
    }).from(schema.parents).innerJoin(schema.studentParents, eq(schema.studentParents.parentId, schema.parents.id))
      .where(eq(schema.studentParents.studentId, studentId));
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  async createDocument(params: { tenantId: string; studentId: string; documentType: string; documentName?: string; documentNumber?: string; fileUrl: string; fileSize?: number; mimeType?: string }) {
    const [inserted] = await this.db.db.insert(schema.studentDocuments).values(params).returning({ id: schema.studentDocuments.id });
    return this.findDocumentById(inserted.id, params.tenantId);
  }

  async findDocumentById(id: string, tenantId?: string) {
    const conditions: any[] = [eq(schema.studentDocuments.id, id)];
    if (tenantId) conditions.push(eq(schema.studentDocuments.tenantId, tenantId));

    const [result] = await this.db.db.select().from(schema.studentDocuments).where(and(...conditions)).limit(1);
    if (!result) throw new NotFoundException('Document not found');
    return result;
  }

  async updateDocument(id: string, params: any) {
    await this.findDocumentById(id);
    const allowed: any = { updatedAt: new Date() };
    for (const key of ['documentType', 'documentName', 'documentNumber', 'fileUrl', 'fileSize', 'mimeType']) {
      if (params[key] !== undefined) allowed[key] = params[key];
    }
    await this.db.db.update(schema.studentDocuments).set(allowed).where(eq(schema.studentDocuments.id, id));
    return this.findDocumentById(id);
  }

  async deleteDocument(id: string) {
    await this.findDocumentById(id);
    await this.db.db.delete(schema.studentDocuments).where(eq(schema.studentDocuments.id, id));
  }

  // ─── Academic Records ─────────────────────────────────────────────────────

  async createAcademicRecord(params: { tenantId: string; branchId: string; studentId: string; classId: string; sectionId?: string; academicYearId: string; rollNumber?: string; isPromoted?: boolean; promotedToClass?: string; promotionDate?: string }) {
    await this.findStudentById(params.studentId);
    const [inserted] = await this.db.db.insert(schema.studentAcademicRecords).values(params).returning({ id: schema.studentAcademicRecords.id });
    return this.findAcademicRecordById(inserted.id, params.tenantId, params.branchId);
  }

  async findAcademicRecordById(id: string, tenantId?: string, branchId?: string) {
    const conditions: any[] = [eq(schema.studentAcademicRecords.id, id)];
    if (tenantId) conditions.push(eq(schema.studentAcademicRecords.tenantId, tenantId));
    if (branchId) conditions.push(eq(schema.studentAcademicRecords.branchId, branchId));

    const [result] = await this.db.db.select().from(schema.studentAcademicRecords).where(and(...conditions)).limit(1);
    if (!result) throw new NotFoundException('Academic record not found');
    return result;
  }

  async promoteStudent(studentId: string, toClassId: string, academicYearId: string, sectionId?: string) {
    const student = await this.findStudentById(studentId);

    const [inserted] = await this.db.db.insert(schema.studentAcademicRecords).values({
      tenantId: student.tenantId, branchId: student.branchId,
      studentId, classId: toClassId, sectionId, academicYearId,
      isPromoted: true, promotionDate: new Date().toISOString().split('T')[0],
    }).returning({ id: schema.studentAcademicRecords.id });

    return this.findAcademicRecordById(inserted.id);
  }
}
