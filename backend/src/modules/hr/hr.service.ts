import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, or, ilike, sql } from 'drizzle-orm';

@Injectable()
export class HrService {
  constructor(private readonly db: DatabaseProvider) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF
  // ═══════════════════════════════════════════════════════════════════════════

  async createStaff(params: {
    tenantId: string;
    branchId: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: string;
    designation?: string;
    departmentId?: string;
    employmentType?: string;
    joiningDate?: string;
    basicSalary?: number;
    isTeaching?: boolean;
    bankName?: string;
    bankAccountNo?: string;
    ifscCode?: string;
  }) {
    const [existing] = await this.db.db
      .select({ id: schema.staff.id })
      .from(schema.staff)
      .where(
        and(
          eq(schema.staff.tenantId, params.tenantId),
          eq(schema.staff.branchId, params.branchId),
          eq(schema.staff.employeeCode, params.employeeCode),
        ),
      )
      .limit(1);
    if (existing) throw new ConflictException('Employee code already exists');

    const [inserted] = await this.db.db
      .insert(schema.staff)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        employeeCode: params.employeeCode,
        firstName: params.firstName,
        lastName: params.lastName,
        dateOfBirth: params.dateOfBirth,
        gender: params.gender,
        phone: params.phone,
        email: params.email,
        address: params.address,
        designation: params.designation,
        departmentId: params.departmentId,
        employmentType: params.employmentType || 'permanent',
        joiningDate: params.joiningDate,
        basicSalary: params.basicSalary
          ? String(params.basicSalary)
          : undefined,
        isTeaching: params.isTeaching ?? false,
        bankName: params.bankName,
        bankAccountNo: params.bankAccountNo,
        ifscCode: params.ifscCode,
      })
      .returning({ id: schema.staff.id });

    const [staff] = await this.db.db
      .select()
      .from(schema.staff)
      .where(eq(schema.staff.id, inserted.id))
      .limit(1);
    return staff;
  }

  async findStaffByBranch(
    branchId: string,
    query: {
      page?: number;
      limit?: number;
      departmentId?: string;
      employmentType?: string;
      isTeaching?: string;
      isActive?: string;
      search?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.staff.branchId, branchId),
      sql`${schema.staff.deletedAt} IS NULL`,
    ];

    if (query.departmentId)
      conditions.push(eq(schema.staff.departmentId, query.departmentId));
    if (query.employmentType)
      conditions.push(eq(schema.staff.employmentType, query.employmentType));
    if (query.isTeaching !== undefined)
      conditions.push(eq(schema.staff.isTeaching, query.isTeaching === 'true'));
    if (query.isActive !== undefined)
      conditions.push(eq(schema.staff.isActive, query.isActive === 'true'));
    if (query.search) {
      conditions.push(
        or(
          ilike(schema.staff.firstName, `%${query.search}%`),
          ilike(schema.staff.lastName, `%${query.search}%`),
          ilike(schema.staff.employeeCode, `%${query.search}%`),
          ilike(schema.staff.email, `%${query.search}%`),
        ),
      );
    }

    const data = await this.db.db
      .select()
      .from(schema.staff)
      .where(and(...conditions))
      .orderBy(desc(schema.staff.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.staff)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findStaffById(id: string, branchId: string) {
    const conditions: any[] = [
      eq(schema.staff.id, id),
      eq(schema.staff.branchId, branchId),
      sql`${schema.staff.deletedAt} IS NULL`,
    ];
    const [result] = await this.db.db
      .select()
      .from(schema.staff)
      .where(and(...conditions))
      .limit(1);
    if (!result) throw new NotFoundException('Staff not found');
    return result;
  }

  async updateStaff(id: string, branchId: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.staff.id })
      .from(schema.staff)
      .where(
        and(
          eq(schema.staff.id, id),
          eq(schema.staff.branchId, branchId),
          sql`${schema.staff.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Staff not found');

    const updateData: any = { ...params, updatedAt: new Date() };
    if (params.basicSalary !== undefined)
      updateData.basicSalary = String(params.basicSalary);

    await this.db.db
      .update(schema.staff)
      .set(updateData)
      .where(eq(schema.staff.id, id));

    const [staff] = await this.db.db
      .select()
      .from(schema.staff)
      .where(eq(schema.staff.id, id))
      .limit(1);
    return staff;
  }

  async deleteStaff(id: string, branchId: string) {
    const [existing] = await this.db.db
      .select({ id: schema.staff.id })
      .from(schema.staff)
      .where(
        and(
          eq(schema.staff.id, id),
          eq(schema.staff.branchId, branchId),
          sql`${schema.staff.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Staff not found');
    await this.db.db
      .update(schema.staff)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.staff.id, id));
    return { success: true };
  }

  // ─── Staff Documents ─────────────────────────────────────────────────────

  async addStaffDocument(
    staffId: string,
    branchId: string,
    params: { documentType: string; documentNumber?: string; fileUrl: string },
  ) {
    await this.findStaffById(staffId, branchId);

    const [inserted] = await this.db.db
      .insert(schema.staffDocuments)
      .values({
        tenantId: (
          await this.db.db
            .select({ tenantId: schema.staff.tenantId })
            .from(schema.staff)
            .where(eq(schema.staff.id, staffId))
            .limit(1)
        )[0]?.tenantId,
        staffId,
        documentType: params.documentType,
        documentNumber: params.documentNumber,
        fileUrl: params.fileUrl,
      })
      .returning({ id: schema.staffDocuments.id });

    const [doc] = await this.db.db
      .select()
      .from(schema.staffDocuments)
      .where(eq(schema.staffDocuments.id, inserted.id))
      .limit(1);
    return doc;
  }

  async findStaffDocuments(staffId: string, branchId: string) {
    await this.findStaffById(staffId, branchId);
    return this.db.db
      .select()
      .from(schema.staffDocuments)
      .where(eq(schema.staffDocuments.staffId, staffId));
  }

  async deleteStaffDocument(id: string, staffId: string, branchId: string) {
    await this.findStaffById(staffId, branchId);
    const [existing] = await this.db.db
      .select({ id: schema.staffDocuments.id })
      .from(schema.staffDocuments)
      .where(
        and(
          eq(schema.staffDocuments.id, id),
          eq(schema.staffDocuments.staffId, staffId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Document not found');
    await this.db.db
      .delete(schema.staffDocuments)
      .where(eq(schema.staffDocuments.id, id));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE
  // ═══════════════════════════════════════════════════════════════════════════

  async createLeaveType(params: {
    tenantId: string;
    name: string;
    code: string;
    daysAllowed: number;
    isPaid?: boolean;
    carryForward?: boolean;
    maxCarryForward?: number;
  }) {
    const [existing] = await this.db.db
      .select({ id: schema.leaveTypes.id })
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.tenantId, params.tenantId),
          eq(schema.leaveTypes.code, params.code),
        ),
      )
      .limit(1);
    if (existing)
      throw new ConflictException('Leave type with this code already exists');

    const [inserted] = await this.db.db
      .insert(schema.leaveTypes)
      .values({
        tenantId: params.tenantId,
        name: params.name,
        code: params.code,
        daysAllowed: params.daysAllowed,
        isPaid: params.isPaid ?? true,
        carryForward: params.carryForward ?? false,
        maxCarryForward: params.maxCarryForward ?? 0,
      })
      .returning({ id: schema.leaveTypes.id });

    const [lt] = await this.db.db
      .select()
      .from(schema.leaveTypes)
      .where(eq(schema.leaveTypes.id, inserted.id))
      .limit(1);
    return lt;
  }

  async findLeaveTypesByTenant(tenantId: string) {
    return this.db.db
      .select()
      .from(schema.leaveTypes)
      .where(eq(schema.leaveTypes.tenantId, tenantId));
  }

  async updateLeaveType(id: string, tenantId: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.leaveTypes.id })
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.id, id),
          eq(schema.leaveTypes.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Leave type not found');
    await this.db.db
      .update(schema.leaveTypes)
      .set({ ...params, updatedAt: new Date() })
      .where(eq(schema.leaveTypes.id, id));
    const [lt] = await this.db.db
      .select()
      .from(schema.leaveTypes)
      .where(eq(schema.leaveTypes.id, id))
      .limit(1);
    return lt;
  }

  async applyLeave(params: {
    tenantId: string;
    branchId: string;
    staffId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    const [lt] = await this.db.db
      .select({
        id: schema.leaveTypes.id,
        daysAllowed: schema.leaveTypes.daysAllowed,
      })
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.id, params.leaveTypeId),
          eq(schema.leaveTypes.tenantId, params.tenantId),
        ),
      )
      .limit(1);
    if (!lt) throw new NotFoundException('Leave type not found');

    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const totalDays =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (totalDays <= 0)
      throw new BadRequestException('End date must be after start date');

    const [inserted] = await this.db.db
      .insert(schema.leaveRequests)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        staffId: params.staffId,
        leaveTypeId: params.leaveTypeId,
        startDate: params.startDate,
        endDate: params.endDate,
        totalDays,
        reason: params.reason,
      })
      .returning({ id: schema.leaveRequests.id });

    const [lr] = await this.db.db
      .select()
      .from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.id, inserted.id))
      .limit(1);
    return lr;
  }

  async findMyLeaves(
    staffId: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.leaveRequests.staffId, staffId)];
    if (query.status)
      conditions.push(eq(schema.leaveRequests.status, query.status));

    const data = await this.db.db
      .select()
      .from(schema.leaveRequests)
      .where(and(...conditions))
      .orderBy(desc(schema.leaveRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.leaveRequests)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findLeaveRequestsByBranch(
    branchId: string,
    query: { page?: number; limit?: number; status?: string; staffId?: string },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.leaveRequests.branchId, branchId)];
    if (query.status)
      conditions.push(eq(schema.leaveRequests.status, query.status));
    if (query.staffId)
      conditions.push(eq(schema.leaveRequests.staffId, query.staffId));

    const data = await this.db.db
      .select()
      .from(schema.leaveRequests)
      .where(and(...conditions))
      .orderBy(desc(schema.leaveRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.leaveRequests)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async reviewLeave(
    id: string,
    branchId: string,
    action: string,
    userId: string,
    rejectReason?: string,
  ) {
    const [existing] = await this.db.db
      .select({
        id: schema.leaveRequests.id,
        status: schema.leaveRequests.status,
      })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.id, id),
          eq(schema.leaveRequests.branchId, branchId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.status !== 'pending')
      throw new BadRequestException(
        'Leave request is already ' + existing.status,
      );

    if (action === 'approved') {
      await this.db.db
        .update(schema.leaveRequests)
        .set({
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.leaveRequests.id, id));
    } else if (action === 'rejected') {
      await this.db.db
        .update(schema.leaveRequests)
        .set({
          status: 'rejected',
          approvedBy: userId,
          approvedAt: new Date(),
          rejectReason: rejectReason || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.leaveRequests.id, id));
    } else {
      throw new BadRequestException('Action must be "approved" or "rejected"');
    }

    const [lr] = await this.db.db
      .select()
      .from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.id, id))
      .limit(1);
    return lr;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL
  // ═══════════════════════════════════════════════════════════════════════════

  async createSalaryComponent(params: {
    tenantId: string;
    branchId: string;
    name: string;
    type: string;
    calculationType?: string;
    value?: number;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.payrollSalaryComponents)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        name: params.name,
        type: params.type,
        calculationType: params.calculationType || 'fixed',
        value: params.value !== undefined ? String(params.value) : '0',
      })
      .returning({ id: schema.payrollSalaryComponents.id });

    const [comp] = await this.db.db
      .select()
      .from(schema.payrollSalaryComponents)
      .where(eq(schema.payrollSalaryComponents.id, inserted.id))
      .limit(1);
    return comp;
  }

  async findSalaryComponents(branchId: string) {
    return this.db.db
      .select()
      .from(schema.payrollSalaryComponents)
      .where(
        and(
          eq(schema.payrollSalaryComponents.branchId, branchId),
          eq(schema.payrollSalaryComponents.isActive, true),
        ),
      );
  }

  async updateSalaryComponent(id: string, branchId: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.payrollSalaryComponents.id })
      .from(schema.payrollSalaryComponents)
      .where(
        and(
          eq(schema.payrollSalaryComponents.id, id),
          eq(schema.payrollSalaryComponents.branchId, branchId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Salary component not found');
    await this.db.db
      .update(schema.payrollSalaryComponents)
      .set({ ...params, updatedAt: new Date() })
      .where(eq(schema.payrollSalaryComponents.id, id));
    const [comp] = await this.db.db
      .select()
      .from(schema.payrollSalaryComponents)
      .where(eq(schema.payrollSalaryComponents.id, id))
      .limit(1);
    return comp;
  }

  async processPayroll(params: {
    tenantId: string;
    branchId: string;
    staffId: string;
    month: number;
    year: number;
    basicPay?: number;
    allowances?: { componentId: string; amount: number }[];
    deductions?: { componentId: string; amount: number }[];
    paymentDate?: string;
    paymentMethod?: string;
    transactionRef?: string;
    remarks?: string;
    processedBy: string;
  }) {
    const [existing] = await this.db.db
      .select({ id: schema.payroll.id })
      .from(schema.payroll)
      .where(
        and(
          eq(schema.payroll.staffId, params.staffId),
          eq(schema.payroll.month, params.month),
          eq(schema.payroll.year, params.year),
        ),
      )
      .limit(1);
    if (existing)
      throw new ConflictException(
        'Payroll already processed for this staff/month/year',
      );

    const staff = await this.db.db
      .select({ basicSalary: schema.staff.basicSalary })
      .from(schema.staff)
      .where(eq(schema.staff.id, params.staffId))
      .limit(1);
    const basicPay =
      params.basicPay ??
      (staff[0]?.basicSalary ? Number(staff[0].basicSalary) : 0);

    const allowances = params.allowances || [];
    const deductions = params.deductions || [];
    const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const grossPay = basicPay + totalAllowances;
    const netPay = grossPay - totalDeductions;

    const [inserted] = await this.db.db
      .insert(schema.payroll)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        staffId: params.staffId,
        month: params.month,
        year: params.year,
        basicPay: String(basicPay),
        allowances,
        deductions,
        grossPay: String(grossPay),
        totalDeductions: String(totalDeductions),
        netPay: String(netPay),
        paymentDate: params.paymentDate,
        paymentMethod: params.paymentMethod,
        transactionRef: params.transactionRef,
        status: 'processed',
        remarks: params.remarks,
        processedBy: params.processedBy,
        processedAt: new Date(),
      })
      .returning({ id: schema.payroll.id });

    const [payroll] = await this.db.db
      .select()
      .from(schema.payroll)
      .where(eq(schema.payroll.id, inserted.id))
      .limit(1);
    return payroll;
  }

  async findPayrollsByBranch(
    branchId: string,
    query: {
      page?: number;
      limit?: number;
      month?: number;
      year?: number;
      status?: string;
      staffId?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.payroll.branchId, branchId)];
    if (query.month) conditions.push(eq(schema.payroll.month, query.month));
    if (query.year) conditions.push(eq(schema.payroll.year, query.year));
    if (query.status) conditions.push(eq(schema.payroll.status, query.status));
    if (query.staffId)
      conditions.push(eq(schema.payroll.staffId, query.staffId));

    const data = await this.db.db
      .select()
      .from(schema.payroll)
      .where(and(...conditions))
      .orderBy(desc(schema.payroll.year), desc(schema.payroll.month))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.payroll)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findPayrollsByStaff(staffId: string, branchId: string) {
    return this.db.db
      .select()
      .from(schema.payroll)
      .where(
        and(
          eq(schema.payroll.staffId, staffId),
          eq(schema.payroll.branchId, branchId),
        ),
      )
      .orderBy(desc(schema.payroll.year), desc(schema.payroll.month));
  }
}
