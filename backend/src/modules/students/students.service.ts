import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '../../database/schema';
import { eq, and, isNull, or, ilike, desc, asc, count, sql, inArray } from 'drizzle-orm';

@Injectable()
export class StudentsService {
  constructor(private readonly db: DatabaseProvider) {}

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
      parentPhone: params.parentPhone, parentEmail: params.parentEmail,
      address: params.address, classId: params.classId,
      academicYearId: params.academicYearId, source: params.source,
      remarks: params.remarks, followUpDate: params.followUpDate,
    }).returning({ id: schema.enquiries.id });
    return this.findEnquiryById(inserted.id);
  }

  async findEnquiryById(id: string) {
    const [result] = await this.db.db.select().from(schema.enquiries).where(eq(schema.enquiries.id, id)).limit(1);
    if (!result) throw new NotFoundException('Enquiry not found');
    return result;
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
    await this.db.db.update(schema.enquiries).set({ ...params, updatedAt: new Date() }).where(eq(schema.enquiries.id, id));
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
    return this.findApplicationById(insertedApp.id);
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
    const [inserted] = await this.db.db.insert(schema.applications).values({ ...params, applicationNumber }).returning({ id: schema.applications.id });
    return this.findApplicationById(inserted.id);
  }

  async findApplicationById(id: string) {
    const [result] = await this.db.db.select().from(schema.applications).where(eq(schema.applications.id, id)).limit(1);
    if (!result) throw new NotFoundException('Application not found');
    return result;
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
    await this.db.db.update(schema.applications).set({ ...params, updatedAt: new Date() }).where(eq(schema.applications.id, id));
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

    const [studentInserted] = await this.db.db.insert(schema.students).values({
      tenantId: app.tenantId, branchId: app.branchId,
      admissionNumber, applicationId: id,
      firstName: app.studentFirstName, lastName: app.studentLastName,
      dateOfBirth: app.dateOfBirth, gender: app.gender,
      nationality: app.nationality, religion: app.religion,
      caste: app.caste, category: app.category,
      address: app.address, city: app.city, state: app.state, pincode: app.pincode,
      phone: app.phone, email: app.email, bloodGroup: app.bloodGroup,
      admissionDate: new Date().toISOString().split('T')[0],
    }).returning({ id: schema.students.id });
    const studentId = studentInserted.id;

    const recordValues = {
      tenantId: app.tenantId, branchId: app.branchId,
      studentId, classId: app.classId, academicYearId: app.academicYearId,
    };
    await this.db.db.insert(schema.studentAcademicRecords).values(recordValues as any);

    await this.db.db.update(schema.applications).set({ admitted: true, status: 'admitted', updatedAt: new Date() }).where(eq(schema.applications.id, id));

    return this.findStudentById(studentId);
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
    const [inserted] = await this.db.db.insert(schema.students).values({
      tenantId: params.tenantId, branchId: params.branchId,
      admissionNumber, firstName: params.firstName, middleName: params.middleName,
      lastName: params.lastName, dateOfBirth: params.dateOfBirth,
      gender: params.gender, bloodGroup: params.bloodGroup,
      nationality: params.nationality, religion: params.religion,
      caste: params.caste, category: params.category,
      address: params.address, city: params.city, state: params.state, pincode: params.pincode,
      phone: params.phone, email: params.email,
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

    return this.findStudentById(studentId);
  }

  async findStudentById(id: string) {
    const [result] = await this.db.db.select().from(schema.students).where(and(eq(schema.students.id, id), isNull(schema.students.deletedAt))).limit(1);
    if (!result) throw new NotFoundException('Student not found');
    return result;
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
    await this.db.db.update(schema.students).set({ ...params, updatedAt: new Date() }).where(eq(schema.students.id, id));
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
      phone: params.phone,
      email: params.email,
      occupation: params.occupation,
      income: params.income ? String(params.income) : null,
      address: params.address,
      isPrimary: params.isPrimary,
    }).returning({ id: schema.parents.id });
    return this.findParentById(inserted.id);
  }

  async findParentById(id: string) {
    const [result] = await this.db.db.select().from(schema.parents).where(eq(schema.parents.id, id)).limit(1);
    if (!result) throw new NotFoundException('Parent not found');
    return result;
  }

  async updateParent(id: string, params: any) {
    await this.findParentById(id);
    await this.db.db.update(schema.parents).set({ ...params, updatedAt: new Date() }).where(eq(schema.parents.id, id));
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
    return this.findDocumentById(inserted.id);
  }

  async findDocumentById(id: string) {
    const [result] = await this.db.db.select().from(schema.studentDocuments).where(eq(schema.studentDocuments.id, id)).limit(1);
    if (!result) throw new NotFoundException('Document not found');
    return result;
  }

  async updateDocument(id: string, params: any) {
    await this.findDocumentById(id);
    await this.db.db.update(schema.studentDocuments).set({ ...params, updatedAt: new Date() }).where(eq(schema.studentDocuments.id, id));
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
    return this.findAcademicRecordById(inserted.id);
  }

  async findAcademicRecordById(id: string) {
    const [result] = await this.db.db.select().from(schema.studentAcademicRecords).where(eq(schema.studentAcademicRecords.id, id)).limit(1);
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
