import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a role' })
  async create(@CurrentUser() user: any, @Body() dto: CreateRoleDto) {
    const data = await this.rolesService.create({ ...dto, tenantId: user.tenantId });
    return { success: true, data };
  }

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
  async findById(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.rolesService.findById(id, user.tenantId);
    return { success: true, data };
  }

  @Put(':id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a role' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser() user: any) {
    const data = await this.rolesService.update(id, user.tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a role' })
  async remove(@Param('id') id: string) {
    await this.rolesService.softDelete(id);
    return { success: true, message: 'Role deleted' };
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
  async assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    await this.rolesService.assignPermissions(id, dto.permissionIds);
    return { success: true, message: 'Permissions updated' };
  }
}
