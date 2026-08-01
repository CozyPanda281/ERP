import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

@Injectable()
export class PayrollService {
  constructor(private readonly db: DatabaseProvider) {}

  async createSalaryComponent(params: {
    tenantId: string;
    branchId: string;
    name: string;
    type: string;
    calculationType?: string;
    value?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.payrollSalaryComponents)
      .values(params)
      .returning({ id: schema.payrollSalaryComponents.id });
    const [sc] = await this.db.db
      .select()
      .from(schema.payrollSalaryComponents)
      .where(eq(schema.payrollSalaryComponents.id, inserted.id))
      .limit(1);
    return sc;
  }

  async findSalaryComponentsByBranch(branchId: string) {
    return this.db.db
      .select()
      .from(schema.payrollSalaryComponents)
      .where(
        and(
          eq(schema.payrollSalaryComponents.branchId, branchId),
          eq(schema.payrollSalaryComponents.isActive, true),
        ),
      )
      .orderBy(schema.payrollSalaryComponents.name);
  }

  async processPayroll(params: {
    tenantId: string;
    branchId: string;
    staffId: string;
    month: number;
    year: number;
    basicPay?: string;
    allowances?: any[];
    deductions?: any[];
    grossPay?: string;
    totalDeductions?: string;
    netPay?: string;
    paymentDate?: string;
    paymentMethod?: string;
    transactionRef?: string;
    remarks?: string;
    processedBy?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.payroll)
      .values(params)
      .returning({ id: schema.payroll.id });
    const [pr] = await this.db.db
      .select()
      .from(schema.payroll)
      .where(eq(schema.payroll.id, inserted.id))
      .limit(1);
    return pr;
  }

  async findPayrollByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      month?: number;
      year?: number;
      staffId?: string;
      status?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.payroll.branchId, branchId)];
    if (query?.month) conditions.push(eq(schema.payroll.month, query.month));
    if (query?.year) conditions.push(eq(schema.payroll.year, query.year));
    if (query?.staffId)
      conditions.push(eq(schema.payroll.staffId, query.staffId));
    if (query?.status) conditions.push(eq(schema.payroll.status, query.status));
    const data = await this.db.db
      .select()
      .from(schema.payroll)
      .where(and(...conditions))
      .orderBy(desc(schema.payroll.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.payroll)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findPayrollById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.payroll)
      .where(eq(schema.payroll.id, id))
      .limit(1);
    if (!result) throw new NotFoundException('Payroll record not found');
    return result;
  }

  async updatePayrollStatus(id: string, status: string) {
    await this.findPayrollById(id);
    await this.db.db
      .update(schema.payroll)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.payroll.id, id));
    return this.findPayrollById(id);
  }
}
