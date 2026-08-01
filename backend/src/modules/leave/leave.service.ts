import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

@Injectable()
export class LeaveService {
  constructor(private readonly db: DatabaseProvider) {}

  async createLeaveType(params: {
    tenantId: string;
    name: string;
    code: string;
    daysAllowed: number;
    isPaid?: boolean;
    carryForward?: boolean;
    maxCarryForward?: number;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.leaveTypes)
      .values(params)
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
      .where(
        and(
          eq(schema.leaveTypes.tenantId, tenantId),
          eq(schema.leaveTypes.isActive, true),
        ),
      )
      .orderBy(schema.leaveTypes.name);
  }

  async requestLeave(params: {
    tenantId: string;
    branchId: string;
    staffId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason?: string;
    documentUrl?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.leaveRequests)
      .values(params)
      .returning({ id: schema.leaveRequests.id });
    const [lr] = await this.db.db
      .select()
      .from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.id, inserted.id))
      .limit(1);
    return lr;
  }

  async findRequestsByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      staffId?: string;
      status?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.leaveRequests.branchId, branchId)];
    if (query?.staffId)
      conditions.push(eq(schema.leaveRequests.staffId, query.staffId));
    if (query?.status)
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

  async findRequestById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.id, id))
      .limit(1);
    if (!result) throw new NotFoundException('Leave request not found');
    return result;
  }

  async approveRequest(id: string, approvedBy: string) {
    await this.findRequestById(id);
    await this.db.db
      .update(schema.leaveRequests)
      .set({ status: 'approved', approvedBy, approvedAt: new Date() })
      .where(eq(schema.leaveRequests.id, id));
    return this.findRequestById(id);
  }

  async rejectRequest(id: string, approvedBy: string, rejectReason?: string) {
    await this.findRequestById(id);
    await this.db.db
      .update(schema.leaveRequests)
      .set({
        status: 'rejected',
        approvedBy,
        approvedAt: new Date(),
        rejectReason,
      })
      .where(eq(schema.leaveRequests.id, id));
    return this.findRequestById(id);
  }
}
