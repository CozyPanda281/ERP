import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, or, isNull, sql } from 'drizzle-orm';

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseProvider) {}

  async findByTenant(tenantId: string) {
    const result = await this.db.db
      .select()
      .from(schema.roles)
      .where(or(eq(schema.roles.tenantId, tenantId), and(isNull(schema.roles.tenantId), eq(schema.roles.isSystem, true))))
      .orderBy(schema.roles.hierarchyLevel, schema.roles.name);
    return result;
  }

  async findById(id: string) {
    const result = await this.db.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.id, id))
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
      .innerJoin(schema.rolePermissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
      .where(eq(schema.rolePermissions.roleId, roleId));
    return result;
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    await this.findById(roleId);
    await this.db.db
      .delete(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, roleId));
    for (const permissionId of permissionIds) {
      await this.db.db.insert(schema.rolePermissions).values({
        roleId,
        permissionId,
      });
    }
  }
}
