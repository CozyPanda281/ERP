import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

@Injectable()
export class ExpensesService {
  constructor(private readonly db: DatabaseProvider) {}

  async createExpenseCategory(params: {
    tenantId: string;
    name: string;
    description?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.expenseCategories)
      .values(params)
      .returning({ id: schema.expenseCategories.id });
    const [cat] = await this.db.db
      .select()
      .from(schema.expenseCategories)
      .where(eq(schema.expenseCategories.id, inserted.id))
      .limit(1);
    return cat;
  }

  async findExpenseCategoriesByTenant(tenantId: string) {
    return this.db.db
      .select()
      .from(schema.expenseCategories)
      .where(
        and(
          eq(schema.expenseCategories.tenantId, tenantId),
          eq(schema.expenseCategories.isActive, true),
        ),
      )
      .orderBy(schema.expenseCategories.name);
  }

  async createIncomeCategory(params: {
    tenantId: string;
    name: string;
    description?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.incomeCategories)
      .values(params)
      .returning({ id: schema.incomeCategories.id });
    const [cat] = await this.db.db
      .select()
      .from(schema.incomeCategories)
      .where(eq(schema.incomeCategories.id, inserted.id))
      .limit(1);
    return cat;
  }

  async findIncomeCategoriesByTenant(tenantId: string) {
    return this.db.db
      .select()
      .from(schema.incomeCategories)
      .where(
        and(
          eq(schema.incomeCategories.tenantId, tenantId),
          eq(schema.incomeCategories.isActive, true),
        ),
      )
      .orderBy(schema.incomeCategories.name);
  }

  async createExpense(params: {
    tenantId: string;
    branchId: string;
    categoryId?: string;
    amount: string;
    description: string;
    expenseDate: string;
    paymentMethod?: string;
    referenceNumber?: string;
    vendorName?: string;
    billNumber?: string;
    billUrl?: string;
    createdBy?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.expenses)
      .values(params)
      .returning({ id: schema.expenses.id });
    const [exp] = await this.db.db
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.id, inserted.id))
      .limit(1);
    return exp;
  }

  async findExpensesByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      categoryId?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.expenses.branchId, branchId)];
    if (query?.categoryId)
      conditions.push(eq(schema.expenses.categoryId, query.categoryId));
    if (query?.fromDate)
      conditions.push(sql`${schema.expenses.expenseDate} >= ${query.fromDate}`);
    if (query?.toDate)
      conditions.push(sql`${schema.expenses.expenseDate} <= ${query.toDate}`);
    const data = await this.db.db
      .select()
      .from(schema.expenses)
      .where(and(...conditions))
      .orderBy(desc(schema.expenses.expenseDate))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.expenses)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findExpenseById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.id, id))
      .limit(1);
    if (!result) throw new NotFoundException('Expense not found');
    return result;
  }

  async createIncome(params: {
    tenantId: string;
    branchId: string;
    categoryId?: string;
    amount: string;
    description: string;
    incomeDate: string;
    paymentMethod?: string;
    referenceNumber?: string;
    createdBy?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.income)
      .values(params)
      .returning({ id: schema.income.id });
    const [inc] = await this.db.db
      .select()
      .from(schema.income)
      .where(eq(schema.income.id, inserted.id))
      .limit(1);
    return inc;
  }

  async findIncomeByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      categoryId?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.income.branchId, branchId)];
    if (query?.categoryId)
      conditions.push(eq(schema.income.categoryId, query.categoryId));
    if (query?.fromDate)
      conditions.push(sql`${schema.income.incomeDate} >= ${query.fromDate}`);
    if (query?.toDate)
      conditions.push(sql`${schema.income.incomeDate} <= ${query.toDate}`);
    const data = await this.db.db
      .select()
      .from(schema.income)
      .where(and(...conditions))
      .orderBy(desc(schema.income.incomeDate))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.income)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findIncomeById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.income)
      .where(eq(schema.income.id, id))
      .limit(1);
    if (!result) throw new NotFoundException('Income record not found');
    return result;
  }
}
