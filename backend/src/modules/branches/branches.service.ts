import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '../../database/schema';
import { eq, and, isNull, count } from 'drizzle-orm';

@Injectable()
export class BranchesService {
  constructor(private readonly db: DatabaseProvider) {}

  async create(params: {
    tenantId: string;
    name: string;
    code: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    principalId?: string;
    establishedDate?: string;
  }) {
    const existing = await this.db.db
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(and(eq(schema.branches.tenantId, params.tenantId), eq(schema.branches.code, params.code), isNull(schema.branches.deletedAt)))
      .limit(1);
    if (existing.length) {
      throw new ConflictException('Branch code already exists for this tenant');
    }

    const id = uuidv4();
    await this.db.db.insert(schema.branches).values({
      id,
      tenantId: params.tenantId,
      name: params.name,
      code: params.code,
      email: params.email,
      phone: params.phone,
      address: params.address,
      city: params.city,
      state: params.state,
      pincode: params.pincode,
      principalId: params.principalId,
      establishedDate: params.establishedDate,
    });
    return this.findById(id);
  }

  async findById(id: string) {
    const result = await this.db.db
      .select()
      .from(schema.branches)
      .where(and(eq(schema.branches.id, id), isNull(schema.branches.deletedAt)))
      .limit(1);
    if (!result.length) throw new NotFoundException('Branch not found');
    return result[0];
  }

  async findByTenant(tenantId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const data = await this.db.db
      .select()
      .from(schema.branches)
      .where(and(eq(schema.branches.tenantId, tenantId), isNull(schema.branches.deletedAt)))
      .orderBy(schema.branches.name)
      .limit(limit)
      .offset(offset);
    const countResult = await this.db.db
      .select({ count: count() })
      .from(schema.branches)
      .where(and(eq(schema.branches.tenantId, tenantId), isNull(schema.branches.deletedAt)));
    return { data, pagination: { page, limit, total: Number(countResult[0].count) } };
  }

  async update(id: string, params: Partial<{ name: string; email: string; phone: string; address: string; city: string; state: string; pincode: string; principalId: string }>) {
    await this.findById(id);
    const values: any = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        const col = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        (values as any)[col] = value;
      }
    }
    if (Object.keys(values).length === 0) return this.findById(id);
    await this.db.db
      .update(schema.branches)
      .set(values)
      .where(eq(schema.branches.id, id));
    return this.findById(id);
  }

  async softDelete(id: string) {
    await this.findById(id);
    await this.db.db
      .update(schema.branches)
      .set({ deletedAt: new Date() })
      .where(eq(schema.branches.id, id));
  }
}
