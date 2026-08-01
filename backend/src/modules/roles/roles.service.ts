import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '../../database/schema';
import { eq, and, or, isNull, sql } from 'drizzle-orm';

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseProvider) {}

  async findByTenant(tenantId: string) {
    const result = await this.db.db
      .select()
      .from(schema.roles)
      .where(
        or(
          eq(schema.roles.tenantId, tenantId),
          and(isNull(schema.roles.tenantId), eq(schema.roles.isSystem, true)),
        ),
      )
      .orderBy(schema.roles.hierarchyLevel, schema.roles.name);
    return result;
  }

  async findById(id: string, tenantId?: string) {
    const conditions: any[] = [eq(schema.roles.id, id)];
    if (tenantId) conditions.push(eq(schema.roles.tenantId, tenantId));

    const result = await this.db.db
      .select()
      .from(schema.roles)
      .where(and(...conditions))
      .limit(1);
    if (!result.length) throw new NotFoundException('Role not found');
    return result[0];
  }

  async findPermissionsByRole(roleId: string) {
    const result = await this.db.db
      .select({
        id: schema.permissions.id,
        name: schema.permissions.name,
        slug: schema.permissions.slug,
        module: schema.permissions.module,
        description: schema.permissions.description,
        isSystem: schema.permissions.isSystem,
        createdAt: schema.permissions.createdAt,
      })
      .from(schema.permissions)
      .innerJoin(
        schema.rolePermissions,
        eq(schema.rolePermissions.permissionId, schema.permissions.id),
      )
      .where(eq(schema.rolePermissions.roleId, roleId));
    return result;
  }

  async create(params: {
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    hierarchyLevel?: number;
    isSystem?: boolean;
  }) {
    const [existing] = await this.db.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(
        and(
          eq(schema.roles.tenantId, params.tenantId),
          eq(schema.roles.slug, params.slug),
        ),
      )
      .limit(1);
    if (existing)
      throw new ConflictException('Role with this slug already exists');

    const id = uuidv4();
    await this.db.db.insert(schema.roles).values({
      id,
      tenantId: params.tenantId,
      name: params.name,
      slug: params.slug,
      description: params.description,
      hierarchyLevel: params.hierarchyLevel || 0,
      isSystem: params.isSystem || false,
    });
    return this.findById(id, params.tenantId);
  }

  async update(id: string, tenantId: string, params: any) {
    await this.findById(id, tenantId);
    const allowed: any = {};
    if (params.name !== undefined) allowed.name = params.name;
    if (params.description !== undefined)
      allowed.description = params.description;
    if (params.hierarchyLevel !== undefined)
      allowed.hierarchyLevel = params.hierarchyLevel;
    if (params.isSystem !== undefined) allowed.isSystem = params.isSystem;
    await this.db.db
      .update(schema.roles)
      .set(allowed)
      .where(eq(schema.roles.id, id));
    return this.findById(id, tenantId);
  }

  async softDelete(id: string) {
    const [existing] = await this.db.db
      .select({ isSystem: schema.roles.isSystem })
      .from(schema.roles)
      .where(eq(schema.roles.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem)
      throw new ConflictException('Cannot delete system roles');
    await this.db.db.delete(schema.roles).where(eq(schema.roles.id, id));
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    await this.findById(roleId);
    await this.db.db.transaction(async (tx) => {
      await tx
        .delete(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, roleId));
      for (const permissionId of permissionIds) {
        await tx.insert(schema.rolePermissions).values({
          roleId,
          permissionId,
        });
      }
    });
  }
}
