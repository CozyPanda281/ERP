import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ROLES } from '../../common/constants';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantQueryDto } from './dto/tenant-query.dto';
import { SetupTenantDto } from './dto/setup-tenant.dto';
import { UpdateTenantStatusDto } from './dto/update-status.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @AuditLog({ action: 'post_root', module: 'tenants', includeBody: false })
  @Post()
  @ApiOperation({ summary: 'Create a new tenant (public registration)' })
  async create(@Body() dto: CreateTenantDto) {
    const data = await this.tenantsService.create(dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_provision',
    module: 'tenants',
    includeBody: false,
  })
  @Post('provision')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Provision a tenant + owner account + subscription with a custom tenant ID (SuperAdmin)',
  })
  async provision(@Body() dto: ProvisionTenantDto) {
    const data = await this.tenantsService.create(dto);
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants (SuperAdmin)' })
  async findAll(@Query() query: TenantQueryDto) {
    const data = await this.tenantsService.findAll(query);
    return { success: true, ...data };
  }

  @Get('stats')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get tenant statistics (SuperAdmin)' })
  async getStats() {
    const data = await this.tenantsService.getTenantStats();
    return { success: true, data };
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findById(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user.isSuperAdmin && user.tenantId !== id) {
      throw new ForbiddenException('You can only view your own tenant');
    }
    const data = await this.tenantsService.findById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_id',
    module: 'tenants',
    resourceIdParam: 'id',
    includeBody: false,
  })
  @Put(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update tenant details' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: any,
  ) {
    if (!user.isSuperAdmin && user.tenantId !== id) {
      throw new ForbiddenException('You can only update your own tenant');
    }
    const data = await this.tenantsService.update(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'patch_id_status',
    module: 'tenants',
    resourceIdParam: 'id',
    includeBody: false,
  })
  @Patch(':id/status')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate or suspend a tenant (SuperAdmin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    const data = await this.tenantsService.updateStatus(id, dto.status);
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_id_setup',
    module: 'tenants',
    resourceIdParam: 'id',
    includeBody: false,
  })
  @Post(':id/setup')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'First-run setup for a new tenant' })
  async firstRunSetup(
    @Param('id') id: string,
    @Body() dto: SetupTenantDto,
    @CurrentUser() user: any,
  ) {
    if (!user.isSuperAdmin && user.tenantId !== id) {
      throw new ForbiddenException('You can only set up your own tenant');
    }
    const data = await this.tenantsService.firstRunSetup(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_id',
    module: 'tenants',
    resourceIdParam: 'id',
    includeBody: false,
  })
  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a tenant (SuperAdmin)' })
  async remove(@Param('id') id: string) {
    await this.tenantsService.softDelete(id);
    return { success: true, message: 'Tenant deleted' };
  }
}
