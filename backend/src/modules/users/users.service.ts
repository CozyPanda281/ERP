import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { CryptoService } from '../../shared/crypto/crypto.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, isNull, desc, count, sql, inArray } from 'drizzle-orm';
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
    if (!params.roleIds.length)
      throw new BadRequestException('At least one role is required');

    const [existingUser] = await this.db.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, params.tenantId),
          eq(schema.users.email, params.email),
          isNull(schema.users.deletedAt),
        ),
      )
      .limit(1);
    if (existingUser)
      throw new ConflictException(
        'A user with this email already exists in the tenant',
      );

    const roles = await this.db.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(
        and(
          inArray(schema.roles.id, params.roleIds),
          eq(schema.roles.tenantId, params.tenantId),
        ),
      );

    if (roles.length !== params.roleIds.length) {
      const found = new Set(roles.map((r) => r.id));
      const invalid = params.roleIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Invalid roles for this tenant: ${invalid.join(', ')}`,
      );
    }

    const passwordHash = await bcrypt.hash(params.password, 12);
    const userId = uuidv4();
    const encryptedPhone = params.phone
      ? this.crypto.encrypt(params.phone)
      : null;

    await this.db.db.transaction(async (tx) => {
      await tx.insert(schema.users).values({
        id: userId,
        tenantId: params.tenantId,
        email: params.email,
        phone: encryptedPhone,
        passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
      });

      for (const roleId of params.roleIds) {
        await tx.insert(schema.userRoles).values({
          id: uuidv4(),
          tenantId: params.tenantId,
          userId,
          roleId,
          branchId: params.branchId || null,
        });
      }
    });

    return this.findById(userId, params.tenantId);
  }

  private decryptPhone(row: any) {
    if (!row) return row;
    if (row.phone) {
      try {
        row.phone = this.crypto.decrypt(row.phone);
      } catch {
        row.phone = null;
      }
    }
    return row;
  }

  async findById(id: string, tenantId?: string) {
    const conditions: any[] = [
      eq(schema.users.id, id),
      isNull(schema.users.deletedAt),
    ];
    if (tenantId) conditions.push(eq(schema.users.tenantId, tenantId));

    const [user] = await this.db.db
      .select()
      .from(schema.users)
      .where(and(...conditions))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const safe = { ...user } as Record<string, unknown>;
    delete safe.passwordHash;
    delete safe.twoFactorSecret;
    return this.decryptPhone(safe as any);
  }

  async findByTenant(tenantId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const result = await this.db.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        phone: schema.users.phone,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        isActive: schema.users.isActive,
        status: schema.users.status,
        lastLoginAt: schema.users.lastLoginAt,
        createdAt: schema.users.createdAt,
        roles:
          sql`COALESCE(json_agg(json_build_object('role', ${schema.roles.slug}, 'branch_id', ${schema.userRoles.branchId})) FILTER (WHERE ${schema.roles.id} IS NOT NULL), '[]')`.as(
            'roles',
          ),
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(
        and(
          eq(schema.users.tenantId, tenantId),
          isNull(schema.users.deletedAt),
        ),
      )
      .groupBy(schema.users.id)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db.db
      .select({ count: count() })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, tenantId),
          isNull(schema.users.deletedAt),
        ),
      );

    return {
      data: result.map((row) => this.decryptPhone(row)),
      pagination: {
        page,
        limit,
        total: Number(countResult.count),
      },
    };
  }

  async update(id: string, tenantId: string, params: any) {
    await this.findById(id, tenantId);
    const allowed: any = { updatedAt: new Date() };
    if (params.email !== undefined) allowed.email = params.email;
    if (params.firstName !== undefined) allowed.firstName = params.firstName;
    if (params.lastName !== undefined) allowed.lastName = params.lastName;
    if (params.phone !== undefined)
      allowed.phone = this.crypto.encrypt(params.phone);
    if (params.status !== undefined) allowed.status = params.status;
    if (params.password !== undefined)
      allowed.passwordHash = await bcrypt.hash(params.password, 12);
    await this.db.db
      .update(schema.users)
      .set(allowed)
      .where(eq(schema.users.id, id));
    return this.findById(id, tenantId);
  }

  async softDelete(id: string, tenantId: string) {
    const user = await this.findById(id, tenantId);
    await this.db.db
      .update(schema.users)
      .set({ deletedAt: new Date() })
      .where(eq(schema.users.id, id));
  }

  async bulkCreate(
    tenantId: string,
    users: Array<{
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      roleIds: string[];
      branchId?: string;
    }>,
  ) {
    const results: any[] = [];
    const errors: Array<{ email: string; error: string }> = [];

    for (const user of users) {
      try {
        const created = await this.create({ ...user, tenantId });
        results.push(created);
      } catch (err: any) {
        errors.push({
          email: user.email,
          error: err.message || 'Failed to create user',
        });
      }
    }

    return { created: results.length, failed: errors.length, errors, results };
  }
}
