import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import {
  eq,
  and,
  isNull,
  or,
  ilike,
  desc,
  asc,
  count,
  sql,
  inArray,
} from 'drizzle-orm';
import * as schema from '../../database/schema';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly db: DatabaseProvider) {}

  async create(params: {
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    planId: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerFirstName: string;
    ownerLastName: string;
  }) {
    const existing = await this.db.db
      .select()
      .from(schema.tenants)
      .where(
        and(
          eq(schema.tenants.slug, params.slug),
          isNull(schema.tenants.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length) {
      throw new ConflictException('Tenant slug already exists');
    }

    const tenantId = uuidv4();

    await this.db.db.insert(schema.tenants).values({
      id: tenantId,
      name: params.name,
      slug: params.slug,
      email: params.email || null,
      phone: params.phone || null,
    });

    const now = new Date();
    const endDate = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate(),
    );

    await this.db.db.insert(schema.subscriptions).values({
      id: uuidv4(),
      tenantId,
      planId: params.planId,
      startDate: now.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'active',
    });

    const defaultRoles = [
      { name: 'Organization Owner', slug: 'organization-owner', level: 1 },
      { name: 'Principal', slug: 'principal', level: 2 },
      { name: 'Reception', slug: 'reception', level: 3 },
      { name: 'Teacher', slug: 'teacher', level: 4 },
      { name: 'Accountant', slug: 'accountant', level: 4 },
      { name: 'HR', slug: 'hr', level: 4 },
      { name: 'Librarian', slug: 'librarian', level: 4 },
      { name: 'Transport Manager', slug: 'transport-manager', level: 4 },
      { name: 'Hostel Manager', slug: 'hostel-manager', level: 4 },
      { name: 'Parent', slug: 'parent', level: 5 },
      { name: 'Student', slug: 'student', level: 6 },
    ];

    for (const role of defaultRoles) {
      await this.db.db.insert(schema.roles).values({
        id: uuidv4(),
        tenantId,
        name: role.name,
        slug: role.slug,
        hierarchyLevel: role.level,
        isSystem: true,
      });
    }

    const passwordHash = await bcrypt.hash(params.ownerPassword, 12);
    const ownerId = uuidv4();

    await this.db.db.insert(schema.users).values({
      id: ownerId,
      tenantId,
      email: params.ownerEmail,
      passwordHash,
      firstName: params.ownerFirstName,
      lastName: params.ownerLastName,
    });

    const [ownerRole] = await this.db.db
      .select()
      .from(schema.roles)
      .where(
        and(
          eq(schema.roles.tenantId, tenantId),
          eq(schema.roles.slug, 'organization-owner'),
        ),
      )
      .limit(1);

    if (ownerRole) {
      await this.db.db.insert(schema.userRoles).values({
        id: uuidv4(),
        tenantId,
        userId: ownerId,
        roleId: ownerRole.id,
      });
    }

    return this.findById(tenantId);
  }

  async findAll(query: {
    page?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    status?: string;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const whereConditions = [isNull(schema.tenants.deletedAt)];

    if (query.search) {
      const pattern = `%${query.search}%`;
      whereConditions.push(
        or(
          sql`${schema.tenants.name} ILIKE ${pattern}`,
          sql`${schema.tenants.slug} ILIKE ${pattern}`,
          sql`${schema.tenants.email} ILIKE ${pattern}`,
        )!,
      );
    }

    if (query.status) {
      whereConditions.push(eq(schema.tenants.status, query.status));
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const columnMap: Record<string, any> = {
      name: schema.tenants.name,
      slug: schema.tenants.slug,
      email: schema.tenants.email,
      status: schema.tenants.status,
      createdAt: schema.tenants.createdAt,
      updatedAt: schema.tenants.updatedAt,
    };

    const orderColumn = columnMap[sortBy] || schema.tenants.createdAt;
    const orderClause =
      sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    const result = await this.db.db
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        slug: schema.tenants.slug,
        email: schema.tenants.email,
        phone: schema.tenants.phone,
        address: schema.tenants.address,
        city: schema.tenants.city,
        state: schema.tenants.state,
        pincode: schema.tenants.pincode,
        country: schema.tenants.country,
        logoUrl: schema.tenants.logoUrl,
        status: schema.tenants.status,
        maxBranches: schema.tenants.maxBranches,
        maxUsers: schema.tenants.maxUsers,
        maxStudents: schema.tenants.maxStudents,
        maxStaff: schema.tenants.maxStaff,
        storageLimitMb: schema.tenants.storageLimitMb,
        isActive: schema.tenants.isActive,
        metadata: schema.tenants.metadata,
        createdAt: schema.tenants.createdAt,
        updatedAt: schema.tenants.updatedAt,
        deletedAt: schema.tenants.deletedAt,
        subscriptionStatus: schema.subscriptions.status,
        endDate: schema.subscriptions.endDate,
        planName: schema.plans.name,
        planCode: schema.plans.code,
      })
      .from(schema.tenants)
      .leftJoin(
        schema.subscriptions,
        and(
          eq(schema.subscriptions.tenantId, schema.tenants.id),
          inArray(schema.subscriptions.status, ['active', 'trial']),
        ),
      )
      .leftJoin(schema.plans, eq(schema.plans.id, schema.subscriptions.planId))
      .where(and(...whereConditions))
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db.db
      .select({ count: count() })
      .from(schema.tenants)
      .where(and(...whereConditions));

    return {
      data: result,
      pagination: {
        page,
        limit,
        total: Number(countResult.count),
      },
    };
  }

  async getTenantStats() {
    const [result] = await this.db.db
      .select({
        total: count(),
        active: sql`COUNT(*) FILTER (WHERE status = 'active')`.mapWith(Number),
        trial: sql`COUNT(*) FILTER (WHERE status = 'trial')`.mapWith(Number),
        suspended: sql`COUNT(*) FILTER (WHERE status = 'suspended')`.mapWith(
          Number,
        ),
        newLast30Days:
          sql`COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')`.mapWith(
            Number,
          ),
      })
      .from(schema.tenants)
      .where(isNull(schema.tenants.deletedAt));

    return result;
  }

  async findById(id: string) {
    const [result] = await this.db.db
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        slug: schema.tenants.slug,
        email: schema.tenants.email,
        phone: schema.tenants.phone,
        address: schema.tenants.address,
        city: schema.tenants.city,
        state: schema.tenants.state,
        pincode: schema.tenants.pincode,
        country: schema.tenants.country,
        logoUrl: schema.tenants.logoUrl,
        status: schema.tenants.status,
        maxBranches: schema.tenants.maxBranches,
        maxUsers: schema.tenants.maxUsers,
        maxStudents: schema.tenants.maxStudents,
        maxStaff: schema.tenants.maxStaff,
        storageLimitMb: schema.tenants.storageLimitMb,
        isActive: schema.tenants.isActive,
        metadata: schema.tenants.metadata,
        createdAt: schema.tenants.createdAt,
        updatedAt: schema.tenants.updatedAt,
        deletedAt: schema.tenants.deletedAt,
        subscriptionStatus: schema.subscriptions.status,
        endDate: schema.subscriptions.endDate,
        planName: schema.plans.name,
        planCode: schema.plans.code,
      })
      .from(schema.tenants)
      .leftJoin(
        schema.subscriptions,
        eq(schema.subscriptions.tenantId, schema.tenants.id),
      )
      .leftJoin(schema.plans, eq(schema.plans.id, schema.subscriptions.planId))
      .where(and(eq(schema.tenants.id, id), isNull(schema.tenants.deletedAt)))
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);

    if (!result) {
      throw new NotFoundException('Tenant not found');
    }

    return result;
  }

  async findBySlug(slug: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.tenants)
      .where(
        and(eq(schema.tenants.slug, slug), isNull(schema.tenants.deletedAt)),
      )
      .limit(1);

    if (!result) {
      throw new NotFoundException('Tenant not found');
    }

    return result;
  }

  async update(
    id: string,
    params: Partial<{
      name: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      country: string;
    }>,
  ) {
    const tenant = await this.findById(id);

    const updateData: Record<string, any> = {};
    const dbKeyMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      country: 'country',
    };

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && dbKeyMap[key]) {
        (updateData as any)[dbKeyMap[key]] = value;
      }
    }

    if (Object.keys(updateData).length === 0) return tenant;

    await this.db.db
      .update(schema.tenants)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(schema.tenants.id, id));

    return this.findById(id);
  }

  async updateStatus(id: string, status: string) {
    const validStatuses = ['active', 'suspended', 'trial'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    const tenant = await this.findById(id);

    await this.db.db
      .update(schema.tenants)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.tenants.id, id));

    if (status === 'suspended') {
      await this.db.db
        .update(schema.subscriptions)
        .set({ status: 'cancelled', cancelledAt: new Date() })
        .where(
          and(
            eq(schema.subscriptions.tenantId, id),
            inArray(schema.subscriptions.status, ['active', 'trial']),
          ),
        );
    }

    return this.findById(id);
  }

  async softDelete(id: string) {
    const tenant = await this.findById(id);

    await this.db.db
      .update(schema.tenants)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
      .where(eq(schema.tenants.id, id));

    await this.db.db
      .update(schema.subscriptions)
      .set({ status: 'cancelled', cancelledAt: new Date() })
      .where(
        and(
          eq(schema.subscriptions.tenantId, id),
          inArray(schema.subscriptions.status, ['active', 'trial']),
        ),
      );
  }

  async firstRunSetup(
    tenantId: string,
    params: {
      branchName: string;
      branchCode: string;
      academicYearName: string;
      academicYearStart: string;
      academicYearEnd: string;
      className?: string;
    },
  ) {
    const tenant = await this.findById(tenantId);

    const existing = await this.db.db
      .select()
      .from(schema.branches)
      .where(
        and(
          eq(schema.branches.tenantId, tenantId),
          isNull(schema.branches.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length) {
      throw new BadRequestException(
        'Tenant already has branches. First-run setup not available.',
      );
    }

    const branchId = uuidv4();
    await this.db.db.insert(schema.branches).values({
      id: branchId,
      tenantId,
      name: params.branchName,
      code: params.branchCode,
    });

    const academicYearId = uuidv4();
    await this.db.db.insert(schema.academicYears).values({
      id: academicYearId,
      tenantId,
      branchId,
      name: params.academicYearName,
      startDate: params.academicYearStart,
      endDate: params.academicYearEnd,
      isCurrent: true,
    });

    let classId: string | undefined;
    if (params.className) {
      classId = uuidv4();
      await this.db.db.insert(schema.classes).values({
        id: classId,
        tenantId,
        branchId,
        name: params.className,
        displayOrder: 1,
      });
    }

    const ownerRoleRows = await this.db.db
      .select({ id: schema.userRoles.id })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
      .innerJoin(schema.users, eq(schema.users.id, schema.userRoles.userId))
      .where(
        and(
          eq(schema.roles.slug, 'organization-owner'),
          eq(schema.users.tenantId, tenantId),
          isNull(schema.users.deletedAt),
        ),
      );

    if (ownerRoleRows.length) {
      await this.db.db
        .update(schema.userRoles)
        .set({ branchId })
        .where(
          inArray(
            schema.userRoles.id,
            ownerRoleRows.map((row) => row.id),
          ),
        );
    }

    this.logger.log(`First-run setup complete for tenant ${tenantId}`);

    return {
      tenantId,
      branchId,
      academicYearId,
      classId,
      message: 'Tenant setup complete',
    };
  }
}
