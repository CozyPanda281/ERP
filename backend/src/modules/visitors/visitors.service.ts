import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

@Injectable()
export class VisitorsService {
  constructor(private readonly db: DatabaseProvider) {}

  async checkIn(params: { tenantId: string; branchId: string; name: string; phone?: string; email?: string; address?: string; idProofType?: string; idProofNumber?: string; purpose: string; personToMeet?: string; department?: string; vehicleNumber?: string; badgeNumber?: string; temperature?: string; isPreApproved?: boolean }) {
    const [inserted] = await this.db.db.insert(schema.visitors).values({ ...params, checkInTime: new Date() }).returning({ id: schema.visitors.id });
    const [visitor] = await this.db.db.select().from(schema.visitors).where(eq(schema.visitors.id, inserted.id)).limit(1);
    return visitor;
  }

  async findByBranch(branchId: string, query?: { page?: number; limit?: number; status?: string; fromDate?: string; toDate?: string }) {
    const page = query?.page || 1; const limit = Math.min(query?.limit || 20, 100); const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.visitors.branchId, branchId)];
    if (query?.status) conditions.push(eq(schema.visitors.status, query.status));
    if (query?.fromDate) conditions.push(sql`${schema.visitors.checkInTime} >= ${query.fromDate}::timestamp`);
    if (query?.toDate) conditions.push(sql`${schema.visitors.checkInTime} <= ${query.toDate}::timestamp`);
    const data = await this.db.db.select().from(schema.visitors).where(and(...conditions)).orderBy(desc(schema.visitors.checkInTime)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.visitors).where(and(...conditions));
    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findById(id: string) {
    const [result] = await this.db.db.select().from(schema.visitors).where(eq(schema.visitors.id, id)).limit(1);
    if (!result) throw new NotFoundException('Visitor not found');
    return result;
  }

  async checkOut(id: string) {
    const visitor = await this.findById(id);
    if (visitor.status === 'checked_out') throw new NotFoundException('Visitor already checked out');
    await this.db.db.update(schema.visitors).set({ checkOutTime: new Date(), status: 'checked_out', updatedAt: new Date() }).where(eq(schema.visitors.id, id));
    return this.findById(id);
  }
}
