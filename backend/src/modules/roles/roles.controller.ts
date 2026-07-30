import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.HR, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List roles for current tenant' })
  async findAll(@CurrentUser() user: any) {
    const data = await this.rolesService.findByTenant(user.tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get role by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.rolesService.findById(id);
    return { success: true, data };
  }

  @Get(':id/permissions')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get permissions assigned to a role' })
  async getPermissions(@Param('id') id: string) {
    const data = await this.rolesService.findPermissionsByRole(id);
    return { success: true, data };
  }

  @Post(':id/permissions')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign permissions to a role' })
  async assignPermissions(@Param('id') id: string, @Body('permissionIds') permissionIds: string[]) {
    await this.rolesService.assignPermissions(id, permissionIds);
    return { success: true, message: 'Permissions updated' };
  }
}
