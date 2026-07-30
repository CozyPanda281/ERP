import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { CryptoService } from '../../shared/crypto/crypto.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, desc, count, sql } from 'drizzle-orm';
import * as schema from '../../database/schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseProvider,
    private readonly crypto: CryptoService,
  ) {}

  async create(params: {
    tenantId: string;
    email: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
    branchId?: string;
  }) {
    const passwordHash = await bcrypt.hash(params.password, 12);
    const userId = uuidv4();
    const encryptedPhone = params.phone ? this.crypto.encrypt(params.phone) : null;

    await this.db.db.insert(schema.users).values({
      id: userId,
      tenantId: params.tenantId,
      email: params.email,
      phone: encryptedPhone,
      passwordHash,
      firstName: params.firstName,
      lastName: params.lastName,
    });

    for (const roleId of params.roleIds) {
      await this.db.db.insert(schema.userRoles).values({
        id: uuidv4(),
        userId,
        roleId,
        branchId: params.branchId || null,
      });
    }

    return this.findById(userId);
  }

  private decryptPhone(row: any) {
    if (!row) return row;
    if (row.phone) {
      try { row.phone = this.crypto.decrypt(row.phone); } catch { row.phone = null; }
    }
    return row;
  }

  async findById(id: string) {
    const [user] = await this.db.db.select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.decryptPhone(user);
  }

  async findByTenant(tenantId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await this.db.db.select({
      id: schema.users.id,
      email: schema.users.email,
      phone: schema.users.phone,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      isActive: schema.users.isActive,
      status: schema.users.status,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
      roles: sql`COALESCE(json_agg(json_build_object('role', ${schema.roles.slug}, 'branch_id', ${schema.userRoles.branchId})) FILTER (WHERE ${schema.roles.id} IS NOT NULL), '[]')`.as('roles'),
    })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(and(eq(schema.users.tenantId, tenantId), isNull(schema.users.deletedAt)))
      .groupBy(schema.users.id)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db.db.select({ count: count() })
      .from(schema.users)
      .where(and(eq(schema.users.tenantId, tenantId), isNull(schema.users.deletedAt)));

    return {
      data: result.map(row => this.decryptPhone(row)),
      pagination: {
        page,
        limit,
        total: Number(countResult.count),
      },
    };
  }

  async bulkCreate(tenantId: string, users: Array<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleIds: string[];
    branchId?: string;
  }>) {
    const results: any[] = [];
    const errors: Array<{ email: string; error: string }> = [];

    for (const user of users) {
      try {
        const created = await this.create({ ...user, tenantId });
        results.push(created);
      } catch (err: any) {
        errors.push({ email: user.email, error: err.message || 'Failed to create user' });
      }
    }

    return { created: results.length, failed: errors.length, errors, results };
  }
}
