import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { StaffQueryDto } from './dto/staff-query.dto';

@ApiTags('Staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create staff member' })
  async create(@Body() body: CreateStaffDto, @CurrentUser() user: any) {
    const data = await this.service.create({ ...body, tenantId: user.tenantId, branchId: user.branchId });
    return { success: true, data };
  }

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List staff' })
  async findAll(@CurrentUser() user: any, @Query() query: StaffQueryDto) {
    const data = await this.service.findByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get staff by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.service.findById(id);
    return { success: true, data };
  }

  @Put(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update staff' })
  async update(@Param('id') id: string, @Body() body: UpdateStaffDto) {
    const data = await this.service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete staff' })
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':staffId/documents')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Add document' })
  async addDocument(@Param('staffId') staffId: string, @Body() body: AddDocumentDto, @CurrentUser() user: any) {
    const data = await this.service.addDocument({ ...body, staffId, tenantId: user.tenantId });
    return { success: true, data };
  }

  @Get(':staffId/documents')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List documents' })
  async findDocuments(@Param('staffId') staffId: string) {
    const data = await this.service.findDocumentsByStaff(staffId);
    return { success: true, data };
  }
}
