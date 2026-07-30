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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ROLES } from '../../common/constants';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantQueryDto } from './dto/tenant-query.dto';
import { SetupTenantDto } from './dto/setup-tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new tenant (public registration)' })
  async create(@Body() dto: CreateTenantDto) {
    const data = await this.tenantsService.create(dto);
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants (SuperAdmin)' })
  async findAll(@Query() query: TenantQueryDto) {
    return this.tenantsService.findAll(query);
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
  async findById(@Param('id') id: string) {
    const data = await this.tenantsService.findById(id);
    return { success: true, data };
  }

  @Put(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update tenant details' })
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    const data = await this.tenantsService.update(id, dto);
    return { success: true, data };
  }

  @Patch(':id/status')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate or suspend a tenant (SuperAdmin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const data = await this.tenantsService.updateStatus(id, status);
    return { success: true, data };
  }

  @Post(':id/setup')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'First-run setup for a new tenant' })
  async firstRunSetup(@Param('id') id: string, @Body() dto: SetupTenantDto) {
    const data = await this.tenantsService.firstRunSetup(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a tenant (SuperAdmin)' })
  async remove(@Param('id') id: string) {
    await this.tenantsService.softDelete(id);
    return { success: true, message: 'Tenant deleted' };
  }
}
