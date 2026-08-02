import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { WebhooksService } from '../webhooks/webhooks.service';
import * as schema from '../../database/schema';
import {
  eq,
  and,
  desc,
  asc,
  count,
  sql,
  inArray,
  gt,
  gte,
  lte,
  isNull,
} from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FeeService {
  constructor(
    private readonly db: DatabaseProvider,
    private readonly webhooks: WebhooksService,
  ) {}

  // ─── Fee Structures ──────────────────────────────────────────────────────

  async createStructure(params: {
    tenantId: string;
    branchId: string;
    name: string;
    classId: string;
    academicYearId?: string;
    frequency?: string;
    description?: string;
    items: Array<{
      name: string;
      amount: number;
      isOptional?: boolean;
      isRecurring?: boolean;
      frequency?: string;
      dueDay?: number;
      sortOrder?: number;
    }>;
  }) {
    const [existing] = await this.db.db
      .select({ id: schema.feeStructures.id })
      .from(schema.feeStructures)
      .where(
        and(
          eq(schema.feeStructures.branchId, params.branchId),
          eq(schema.feeStructures.name, params.name),
        ),
      )
      .limit(1);
    if (existing)
      throw new ConflictException(
        'Fee structure with this name already exists',
      );

    if (!params.items.length)
      throw new BadRequestException('At least one fee item is required');

    for (const item of params.items) {
      if (item.amount < 0)
        throw new BadRequestException(
          `Item "${item.name}" amount cannot be negative`,
        );
    }

    const structureId = await this.db.db.transaction(async (tx) => {
      const [structure] = await tx
        .insert(schema.feeStructures)
        .values({
          tenantId: params.tenantId,
          branchId: params.branchId,
          name: params.name,
          classId: params.classId,
          academicYearId: params.academicYearId,
          frequency: params.frequency || 'monthly',
          description: params.description,
        })
        .returning({ id: schema.feeStructures.id });

      const itemValues = params.items.map((item, i) => ({
        tenantId: params.tenantId,
        feeStructureId: structure.id,
        name: item.name,
        amount: item.amount.toString(),
        isOptional: item.isOptional || false,
        isRecurring: item.isRecurring !== false,
        frequency: item.frequency || params.frequency || 'monthly',
        dueDay: item.dueDay ?? null,
        sortOrder: item.sortOrder ?? i,
      }));

      await tx.insert(schema.feeStructureItems).values(itemValues);

      return structure.id;
    });

    return this.findStructureById(structureId);
  }

  async findStructureById(id: string, branchId?: string) {
    const conditions: any[] = [eq(schema.feeStructures.id, id)];
    if (branchId) conditions.push(eq(schema.feeStructures.branchId, branchId));

    const [result] = await this.db.db
      .select({
        id: schema.feeStructures.id,
        tenantId: schema.feeStructures.tenantId,
        branchId: schema.feeStructures.branchId,
        name: schema.feeStructures.name,
        classId: schema.feeStructures.classId,
        academicYearId: schema.feeStructures.academicYearId,
        frequency: schema.feeStructures.frequency,
        isActive: schema.feeStructures.isActive,
        description: schema.feeStructures.description,
        createdAt: schema.feeStructures.createdAt,
        className: schema.classes.name,
      })
      .from(schema.feeStructures)
      .leftJoin(
        schema.classes,
        eq(schema.classes.id, schema.feeStructures.classId),
      )
      .where(and(...conditions))
      .limit(1);
    if (!result) throw new NotFoundException('Fee structure not found');

    const items = await this.db.db
      .select({
        id: schema.feeStructureItems.id,
        name: schema.feeStructureItems.name,
        amount: schema.feeStructureItems.amount,
        isOptional: schema.feeStructureItems.isOptional,
        isRecurring: schema.feeStructureItems.isRecurring,
        frequency: schema.feeStructureItems.frequency,
        dueDay: schema.feeStructureItems.dueDay,
        sortOrder: schema.feeStructureItems.sortOrder,
      })
      .from(schema.feeStructureItems)
      .where(eq(schema.feeStructureItems.feeStructureId, id))
      .orderBy(schema.feeStructureItems.sortOrder);

    return { ...result, items };
  }

  async findStructuresByBranch(
    tenantId: string,
    branchId: string | null,
    query: { page?: number; limit?: number; classId?: string },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.feeStructures.tenantId, tenantId),
      isNull(schema.feeStructures.deletedAt),
    ];
    if (branchId) conditions.push(eq(schema.feeStructures.branchId, branchId));

    if (query.classId)
      conditions.push(eq(schema.feeStructures.classId, query.classId));

    const data = await this.db.db
      .select({
        id: schema.feeStructures.id,
        name: schema.feeStructures.name,
        classId: schema.feeStructures.classId,
        frequency: schema.feeStructures.frequency,
        isActive: schema.feeStructures.isActive,
        description: schema.feeStructures.description,
        className: schema.classes.name,
      })
      .from(schema.feeStructures)
      .leftJoin(
        schema.classes,
        eq(schema.classes.id, schema.feeStructures.classId),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.feeStructures.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.feeStructures)
      .where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async updateStructure(id: string, params: any) {
    await this.findStructureById(id);
    const allowed: any = {};
    if (params.name !== undefined) allowed.name = params.name;
    if (params.classId !== undefined) allowed.classId = params.classId;
    if (params.academicYearId !== undefined)
      allowed.academicYearId = params.academicYearId;
    if (params.frequency !== undefined) allowed.frequency = params.frequency;
    if (params.isActive !== undefined) allowed.isActive = params.isActive;
    if (params.description !== undefined)
      allowed.description = params.description;
    allowed.updatedAt = new Date();
    await this.db.db
      .update(schema.feeStructures)
      .set(allowed)
      .where(eq(schema.feeStructures.id, id));
    return this.findStructureById(id);
  }

  async deleteStructure(id: string, branchId: string) {
    await this.findStructureById(id, branchId);
    await this.db.db
      .update(schema.feeStructures)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.feeStructures.id, id));
  }

  // ─── Fee Items ───────────────────────────────────────────────────────────

  async addItem(
    feeStructureId: string,
    params: {
      name: string;
      amount: number;
      isOptional?: boolean;
      isRecurring?: boolean;
      frequency?: string;
      dueDay?: number;
      sortOrder?: number;
    },
  ) {
    const structure = await this.findStructureById(feeStructureId);

    if (params.amount < 0)
      throw new BadRequestException('Amount cannot be negative');

    const [inserted] = await this.db.db
      .insert(schema.feeStructureItems)
      .values({
        tenantId: structure.tenantId,
        feeStructureId,
        name: params.name,
        amount: params.amount.toString(),
        isOptional: params.isOptional || false,
        isRecurring: params.isRecurring !== false,
        frequency: params.frequency,
        dueDay: params.dueDay,
        sortOrder: params.sortOrder,
      })
      .returning({ id: schema.feeStructureItems.id });

    const [item] = await this.db.db
      .select()
      .from(schema.feeStructureItems)
      .where(eq(schema.feeStructureItems.id, inserted.id))
      .limit(1);
    return item;
  }

  async updateItem(id: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.feeStructureItems.id })
      .from(schema.feeStructureItems)
      .where(eq(schema.feeStructureItems.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Fee item not found');

    if (params.amount !== undefined && params.amount < 0)
      throw new BadRequestException('Amount cannot be negative');

    const allowed: any = {};
    if (params.name !== undefined) allowed.name = params.name;
    if (params.amount !== undefined) allowed.amount = params.amount.toString();
    if (params.isOptional !== undefined) allowed.isOptional = params.isOptional;
    if (params.isRecurring !== undefined)
      allowed.isRecurring = params.isRecurring;
    if (params.frequency !== undefined) allowed.frequency = params.frequency;
    if (params.dueDay !== undefined) allowed.dueDay = params.dueDay;
    if (params.sortOrder !== undefined) allowed.sortOrder = params.sortOrder;
    allowed.updatedAt = new Date();
    await this.db.db
      .update(schema.feeStructureItems)
      .set(allowed)
      .where(eq(schema.feeStructureItems.id, id));

    const [item] = await this.db.db
      .select()
      .from(schema.feeStructureItems)
      .where(eq(schema.feeStructureItems.id, id))
      .limit(1);
    return item;
  }

  async removeItem(id: string) {
    const [existing] = await this.db.db
      .select({ id: schema.feeStructureItems.id })
      .from(schema.feeStructureItems)
      .where(eq(schema.feeStructureItems.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Fee item not found');
    await this.db.db
      .delete(schema.feeStructureItems)
      .where(eq(schema.feeStructureItems.id, id));
  }

  // ─── Discounts ───────────────────────────────────────────────────────────

  async createDiscount(params: {
    tenantId: string;
    branchId: string;
    name: string;
    discountType: string;
    value: number;
    applicableTo?: string;
    applicableIds?: string[];
    isActive?: boolean;
    validFrom?: string;
    validUntil?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.feeDiscounts)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        name: params.name,
        discountType: params.discountType,
        value: params.value.toString(),
        applicableTo: params.applicableTo || 'all',
        applicableIds: params.applicableIds || [],
        isActive: params.isActive ?? true,
        validFrom: params.validFrom,
        validUntil: params.validUntil,
      })
      .returning({ id: schema.feeDiscounts.id });

    const [discount] = await this.db.db
      .select()
      .from(schema.feeDiscounts)
      .where(eq(schema.feeDiscounts.id, inserted.id))
      .limit(1);
    return discount;
  }

  async findDiscountsByBranch(tenantId: string, branchId: string | null) {
    const conditions: any[] = [eq(schema.feeDiscounts.tenantId, tenantId)];
    if (branchId) conditions.push(eq(schema.feeDiscounts.branchId, branchId));
    return this.db.db
      .select()
      .from(schema.feeDiscounts)
      .where(and(...conditions))
      .orderBy(desc(schema.feeDiscounts.createdAt));
  }

  async updateDiscount(id: string, branchId: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.feeDiscounts.id })
      .from(schema.feeDiscounts)
      .where(
        and(
          eq(schema.feeDiscounts.id, id),
          eq(schema.feeDiscounts.branchId, branchId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Discount not found');

    if (params.value !== undefined) params.value = params.value.toString();

    const allowed: any = {};
    if (params.name !== undefined) allowed.name = params.name;
    if (params.discountType !== undefined)
      allowed.discountType = params.discountType;
    if (params.value !== undefined) allowed.value = params.value.toString();
    if (params.isActive !== undefined) allowed.isActive = params.isActive;
    if (params.validFrom !== undefined) allowed.validFrom = params.validFrom;
    if (params.validUntil !== undefined) allowed.validUntil = params.validUntil;
    allowed.updatedAt = new Date();
    await this.db.db
      .update(schema.feeDiscounts)
      .set(allowed)
      .where(eq(schema.feeDiscounts.id, id));
    const [discount] = await this.db.db
      .select()
      .from(schema.feeDiscounts)
      .where(eq(schema.feeDiscounts.id, id))
      .limit(1);
    return discount;
  }

  async deleteDiscount(id: string, branchId: string) {
    const [existing] = await this.db.db
      .select({ id: schema.feeDiscounts.id })
      .from(schema.feeDiscounts)
      .where(
        and(
          eq(schema.feeDiscounts.id, id),
          eq(schema.feeDiscounts.branchId, branchId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Discount not found');
    await this.db.db
      .delete(schema.feeDiscounts)
      .where(eq(schema.feeDiscounts.id, id));
  }

  // ─── Student Fee Accounts ────────────────────────────────────────────────

  async assignFeeStructure(params: {
    tenantId: string;
    branchId: string;
    feeStructureId: string;
    academicYearId?: string;
    studentIds: string[];
  }) {
    const structure = await this.findStructureById(params.feeStructureId);

    const existingStudents = await this.db.db
      .select({ id: schema.students.id })
      .from(schema.students)
      .where(
        and(
          inArray(schema.students.id, params.studentIds),
          eq(schema.students.branchId, params.branchId),
          eq(schema.students.isActive, true),
        ),
      );

    if (existingStudents.length !== params.studentIds.length) {
      const found = new Set(existingStudents.map((s) => s.id));
      const missing = params.studentIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Invalid or inactive students: ${missing.join(', ')}`,
      );
    }

    const totalFee = structure.items.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    const values = params.studentIds.map((studentId) => ({
      tenantId: params.tenantId,
      branchId: params.branchId,
      studentId,
      feeStructureId: params.feeStructureId,
      academicYearId: params.academicYearId || structure.academicYearId,
      totalFee: totalFee.toString(),
      totalDiscount: '0',
      totalPaid: '0',
      totalDue: totalFee.toString(),
      status: 'active',
    }));

    await this.db.db.transaction(async (tx) => {
      await tx
        .insert(schema.studentFeeAccounts)
        .values(values)
        .onConflictDoNothing({
          target: [
            schema.studentFeeAccounts.studentId,
            schema.studentFeeAccounts.academicYearId,
          ],
        });
    });

    return this.db.db
      .select()
      .from(schema.studentFeeAccounts)
      .where(inArray(schema.studentFeeAccounts.studentId, params.studentIds));
  }

  async findAccountByStudent(
    studentId: string,
    tenantId: string,
    branchId: string | null,
  ) {
    const conditions: any[] = [
      eq(schema.studentFeeAccounts.studentId, studentId),
      eq(schema.studentFeeAccounts.tenantId, tenantId),
    ];
    if (branchId)
      conditions.push(eq(schema.studentFeeAccounts.branchId, branchId));

    const [account] = await this.db.db
      .select({
        id: schema.studentFeeAccounts.id,
        studentId: schema.studentFeeAccounts.studentId,
        totalFee: schema.studentFeeAccounts.totalFee,
        totalDiscount: schema.studentFeeAccounts.totalDiscount,
        totalPaid: schema.studentFeeAccounts.totalPaid,
        totalDue: schema.studentFeeAccounts.totalDue,
        status: schema.studentFeeAccounts.status,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        admissionNumber: schema.students.admissionNumber,
        rollNumber: schema.students.rollNumber,
        className: schema.classes.name,
        feeStructureName: schema.feeStructures.name,
      })
      .from(schema.studentFeeAccounts)
      .innerJoin(
        schema.students,
        eq(schema.students.id, schema.studentFeeAccounts.studentId),
      )
      .leftJoin(
        schema.feeStructures,
        eq(schema.feeStructures.id, schema.studentFeeAccounts.feeStructureId),
      )
      .leftJoin(
        schema.classes,
        eq(schema.classes.id, schema.feeStructures.classId),
      )
      .where(
        and(
          eq(schema.studentFeeAccounts.studentId, studentId),
          eq(schema.studentFeeAccounts.tenantId, tenantId),
          ...(branchId
            ? [eq(schema.studentFeeAccounts.branchId, branchId)]
            : []),
        ),
      )
      .limit(1);

    if (!account)
      throw new NotFoundException('Fee account not found for this student');
    return account;
  }

  async findAccountsByBranch(
    tenantId: string,
    branchId: string | null,
    query: { page?: number; limit?: number; classId?: string; status?: string },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.studentFeeAccounts.tenantId, tenantId),
    ];
    if (branchId)
      conditions.push(eq(schema.studentFeeAccounts.branchId, branchId));

    if (query.status)
      conditions.push(eq(schema.studentFeeAccounts.status, query.status));

    const data = await this.db.db
      .select({
        id: schema.studentFeeAccounts.id,
        studentId: schema.studentFeeAccounts.studentId,
        totalFee: schema.studentFeeAccounts.totalFee,
        totalPaid: schema.studentFeeAccounts.totalPaid,
        totalDue: schema.studentFeeAccounts.totalDue,
        status: schema.studentFeeAccounts.status,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        admissionNumber: schema.students.admissionNumber,
        rollNumber: schema.students.rollNumber,
        className: schema.classes.name,
      })
      .from(schema.studentFeeAccounts)
      .innerJoin(
        schema.students,
        eq(schema.students.id, schema.studentFeeAccounts.studentId),
      )
      .leftJoin(
        schema.feeStructures,
        eq(schema.feeStructures.id, schema.studentFeeAccounts.feeStructureId),
      )
      .leftJoin(
        schema.classes,
        eq(schema.classes.id, schema.feeStructures.classId),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.studentFeeAccounts.totalDue))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.studentFeeAccounts)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  // ─── Invoices ────────────────────────────────────────────────────────────

  async generateInvoice(params: {
    tenantId: string;
    branchId: string;
    studentId: string;
    items: Array<{ name: string; amount: number }>;
    subtotal: number;
    discountTotal?: number;
    totalAmount: number;
    dueDate: string;
  }) {
    const invoiceNumber = `INV-${params.branchId.slice(0, 4).toUpperCase()}-${Date.now()}`;

    const [invoiceRow] = await this.db.db
      .insert(schema.feeInvoices)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        studentId: params.studentId,
        invoiceNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: params.dueDate,
        items: params.items,
        subtotal: params.subtotal.toString(),
        discountTotal: (params.discountTotal || 0).toString(),
        totalAmount: params.totalAmount.toString(),
        amountPaid: '0',
        balanceDue: params.totalAmount.toString(),
        status: 'pending',
      })
      .returning({ id: schema.feeInvoices.id });

    const invoice = await this.findInvoiceById(invoiceRow.id, params.branchId);
    this.webhooks.emit(
      'fee.invoice.generated',
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentId: params.studentId,
        totalAmount: params.totalAmount,
        dueDate: params.dueDate,
      },
      params.tenantId,
    );
    return invoice;
  }

  async findInvoiceById(id: string, branchId?: string) {
    const conditions: any[] = [eq(schema.feeInvoices.id, id)];
    if (branchId) conditions.push(eq(schema.feeInvoices.branchId, branchId));

    const [result] = await this.db.db
      .select({
        id: schema.feeInvoices.id,
        invoiceNumber: schema.feeInvoices.invoiceNumber,
        invoiceDate: schema.feeInvoices.invoiceDate,
        dueDate: schema.feeInvoices.dueDate,
        items: schema.feeInvoices.items,
        subtotal: schema.feeInvoices.subtotal,
        discountTotal: schema.feeInvoices.discountTotal,
        totalAmount: schema.feeInvoices.totalAmount,
        amountPaid: schema.feeInvoices.amountPaid,
        balanceDue: schema.feeInvoices.balanceDue,
        status: schema.feeInvoices.status,
        createdAt: schema.feeInvoices.createdAt,
        studentId: schema.feeInvoices.studentId,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        admissionNumber: schema.students.admissionNumber,
      })
      .from(schema.feeInvoices)
      .innerJoin(
        schema.students,
        eq(schema.students.id, schema.feeInvoices.studentId),
      )
      .where(and(...conditions))
      .limit(1);
    if (!result) throw new NotFoundException('Invoice not found');
    return result;
  }

  async findInvoicesByStudent(
    studentId: string,
    tenantId: string,
    branchId: string | null,
    query: { page?: number; limit?: number; status?: string },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.feeInvoices.studentId, studentId),
      eq(schema.feeInvoices.tenantId, tenantId),
    ];
    if (branchId) conditions.push(eq(schema.feeInvoices.branchId, branchId));
    if (query.status)
      conditions.push(eq(schema.feeInvoices.status, query.status));

    const data = await this.db.db
      .select()
      .from(schema.feeInvoices)
      .where(and(...conditions))
      .orderBy(desc(schema.feeInvoices.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.feeInvoices)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findInvoicesByBranch(
    tenantId: string,
    branchId: string | null,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.feeInvoices.tenantId, tenantId)];
    if (branchId) conditions.push(eq(schema.feeInvoices.branchId, branchId));

    if (query.status)
      conditions.push(eq(schema.feeInvoices.status, query.status));
    if (query.fromDate)
      conditions.push(gte(schema.feeInvoices.invoiceDate, query.fromDate));
    if (query.toDate)
      conditions.push(lte(schema.feeInvoices.invoiceDate, query.toDate));

    const data = await this.db.db
      .select()
      .from(schema.feeInvoices)
      .where(and(...conditions))
      .orderBy(desc(schema.feeInvoices.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.feeInvoices)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  // ─── Payments ────────────────────────────────────────────────────────────

  async recordPayment(params: {
    tenantId: string;
    branchId: string;
    createdBy: string;
    studentId: string;
    invoiceId?: string;
    amount: number;
    paymentMethod?: string;
    paymentDate?: string;
    referenceNumber?: string;
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    upiId?: string;
    remarks?: string;
  }) {
    const [student] = await this.db.db
      .select({ id: schema.students.id })
      .from(schema.students)
      .where(
        and(
          eq(schema.students.id, params.studentId),
          eq(schema.students.branchId, params.branchId),
        ),
      )
      .limit(1);
    if (!student) throw new NotFoundException('Student not found');

    let invoice: any = null;
    if (params.invoiceId) {
      invoice = await this.findInvoiceById(params.invoiceId, params.branchId);
      if (Number(invoice.balanceDue) < params.amount) {
        throw new BadRequestException(
          `Payment amount (${params.amount}) exceeds balance due (${invoice.balanceDue})`,
        );
      }
    }

    const transactionNo = `TXN-${params.branchId.slice(0, 4).toUpperCase()}-${Date.now()}`;
    const paidDate =
      params.paymentDate || new Date().toISOString().split('T')[0];

    const txnResult = await this.db.db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(schema.feeTransactions)
        .values({
          tenantId: params.tenantId,
          branchId: params.branchId,
          studentId: params.studentId,
          transactionNo,
          amount: params.amount.toString(),
          paymentMethod: params.paymentMethod || 'cash',
          paymentDate: paidDate ? new Date(paidDate) : new Date(),
          paidDate,
          referenceNumber: params.referenceNumber,
          chequeNumber: params.chequeNumber,
          chequeDate: params.chequeDate,
          bankName: params.bankName,
          upiId: params.upiId,
          status: 'completed',
          remarks: params.remarks,
          createdBy: params.createdBy,
        })
        .returning({ id: schema.feeTransactions.id });

      const receiptNumber = `RCPT-${params.branchId.slice(0, 4).toUpperCase()}-${Date.now()}`;
      await tx.insert(schema.feeReceipts).values({
        tenantId: params.tenantId,
        transactionId: transaction.id,
        receiptNumber,
        receiptDate: paidDate,
      });

      if (invoice) {
        const newPaid = Number(invoice.amountPaid) + params.amount;
        const newBalance = Number(invoice.totalAmount) - newPaid;
        const newStatus = newBalance <= 0 ? 'paid' : 'partial';

        await tx
          .update(schema.feeInvoices)
          .set({
            amountPaid: newPaid.toString(),
            balanceDue: Math.max(0, newBalance).toString(),
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(schema.feeInvoices.id, params.invoiceId!));
      }

      const [account] = await tx
        .select({
          id: schema.studentFeeAccounts.id,
          totalPaid: schema.studentFeeAccounts.totalPaid,
          totalDue: schema.studentFeeAccounts.totalDue,
        })
        .from(schema.studentFeeAccounts)
        .where(
          and(
            eq(schema.studentFeeAccounts.studentId, params.studentId),
            eq(schema.studentFeeAccounts.branchId, params.branchId),
          ),
        )
        .limit(1);

      if (account) {
        const currentPaid = Number(account.totalPaid) || 0;
        const currentDue = Number(account.totalDue) || 0;

        const newPaid = currentPaid + params.amount;
        const newDue = Math.max(0, currentDue - params.amount);

        await tx
          .update(schema.studentFeeAccounts)
          .set({
            totalPaid: newPaid.toString(),
            totalDue: newDue.toString(),
            updatedAt: new Date(),
          })
          .where(eq(schema.studentFeeAccounts.id, account.id));
      }

      const [txnResult] = await tx
        .select({
          id: schema.feeTransactions.id,
          transactionNo: schema.feeTransactions.transactionNo,
          amount: schema.feeTransactions.amount,
          paymentMethod: schema.feeTransactions.paymentMethod,
          paidDate: schema.feeTransactions.paidDate,
          status: schema.feeTransactions.status,
          referenceNumber: schema.feeTransactions.referenceNumber,
        })
        .from(schema.feeTransactions)
        .where(eq(schema.feeTransactions.id, transaction.id))
        .limit(1);
      return txnResult;
    });

    this.webhooks.emit(
      'fee.payment.recorded',
      {
        transactionId: txnResult.id,
        transactionNo: txnResult.transactionNo,
        studentId: params.studentId,
        invoiceId: params.invoiceId,
        amount: params.amount,
        paymentMethod: params.paymentMethod || 'cash',
      },
      params.tenantId,
    );
    return txnResult;
  }

  async findPaymentsByStudent(
    studentId: string,
    tenantId: string,
    branchId: string | null,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(schema.feeTransactions.studentId, studentId),
      eq(schema.feeTransactions.tenantId, tenantId),
    ];
    if (branchId)
      conditions.push(eq(schema.feeTransactions.branchId, branchId));

    const data = await this.db.db
      .select()
      .from(schema.feeTransactions)
      .where(and(...conditions))
      .orderBy(desc(schema.feeTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.feeTransactions)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findPaymentsByBranch(
    tenantId: string,
    branchId: string | null,
    query: {
      page?: number;
      limit?: number;
      paymentMethod?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.feeTransactions.tenantId, tenantId)];
    if (branchId)
      conditions.push(eq(schema.feeTransactions.branchId, branchId));

    if (query.paymentMethod)
      conditions.push(
        eq(schema.feeTransactions.paymentMethod, query.paymentMethod),
      );
    if (query.fromDate)
      conditions.push(gte(schema.feeTransactions.paidDate, query.fromDate));
    if (query.toDate)
      conditions.push(lte(schema.feeTransactions.paidDate, query.toDate));

    const data = await this.db.db
      .select({
        id: schema.feeTransactions.id,
        transactionNo: schema.feeTransactions.transactionNo,
        amount: schema.feeTransactions.amount,
        paymentMethod: schema.feeTransactions.paymentMethod,
        paidDate: schema.feeTransactions.paidDate,
        status: schema.feeTransactions.status,
        studentId: schema.feeTransactions.studentId,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        admissionNumber: schema.students.admissionNumber,
      })
      .from(schema.feeTransactions)
      .innerJoin(
        schema.students,
        eq(schema.students.id, schema.feeTransactions.studentId),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.feeTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.feeTransactions)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findReceiptByTransaction(transactionId: string) {
    const [receipt] = await this.db.db
      .select()
      .from(schema.feeReceipts)
      .where(eq(schema.feeReceipts.transactionId, transactionId))
      .limit(1);
    if (!receipt) throw new NotFoundException('Receipt not found');
    return receipt;
  }

  // ─── Reports ─────────────────────────────────────────────────────────────

  async getCollectionReport(
    branchId: string,
    query: { fromDate?: string; toDate?: string },
  ) {
    const conditions: any[] = [
      eq(schema.feeTransactions.branchId, branchId),
      eq(schema.feeTransactions.status, 'completed'),
    ];
    if (query.fromDate)
      conditions.push(gte(schema.feeTransactions.paidDate, query.fromDate));
    if (query.toDate)
      conditions.push(lte(schema.feeTransactions.paidDate, query.toDate));

    const [totalCollected] = await this.db.db
      .select({
        total:
          sql`COALESCE(SUM(${schema.feeTransactions.amount}), 0)`.as<number>(),
      })
      .from(schema.feeTransactions)
      .where(and(...conditions));

    const methodBreakdown = await this.db.db
      .select({
        method: schema.feeTransactions.paymentMethod,
        total:
          sql`COALESCE(SUM(${schema.feeTransactions.amount}), 0)`.as<number>(),
        count: count(),
      })
      .from(schema.feeTransactions)
      .where(and(...conditions))
      .groupBy(schema.feeTransactions.paymentMethod);

    const [overdueCount] = await this.db.db
      .select({
        count: count(),
      })
      .from(schema.studentFeeAccounts)
      .where(
        and(
          eq(schema.studentFeeAccounts.branchId, branchId),
          gt(schema.studentFeeAccounts.totalDue, '0'),
        ),
      );

    return {
      totalCollected: Number(totalCollected.total),
      methodBreakdown,
      overdueAccounts: Number(overdueCount.count),
    };
  }
}
