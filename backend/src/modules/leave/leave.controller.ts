import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { RequestLeaveDto } from './dto/request-leave.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Leave')
@ApiBearerAuth()
@Controller('leave')
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @AuditLog({ action: 'post_types', module: 'leave' })
  @Post('types')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create leave type' })
  async createLeaveType(
    @Body() body: CreateLeaveTypeDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createLeaveType({
      ...body,
      tenantId: user.tenantId,
    });
    return { success: true, data };
  }

  @Get('types')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List leave types' })
  async getLeaveTypes(@CurrentUser() user: any) {
    const data = await this.service.findLeaveTypesByTenant(user.tenantId);
    return { success: true, data };
  }

  @AuditLog({ action: 'post_requests', module: 'leave' })
  @Post('requests')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Request leave' })
  async requestLeave(@Body() body: RequestLeaveDto, @CurrentUser() user: any) {
    const data = await this.service.requestLeave({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('requests')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List leave requests' })
  async getRequests(@CurrentUser() user: any, @Query() query: LeaveQueryDto) {
    const data = await this.service.findRequestsByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get('requests/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get leave request' })
  async getRequestById(@Param('id') id: string) {
    const data = await this.service.findRequestById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_requests_id_approve',
    module: 'leave',
    resourceIdParam: 'id',
  })
  @Put('requests/:id/approve')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Approve leave request' })
  async approveRequest(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.service.approveRequest(id, user.id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_requests_id_reject',
    module: 'leave',
    resourceIdParam: 'id',
  })
  @Put('requests/:id/reject')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Reject leave request' })
  async rejectRequest(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.rejectRequest(id, user.id, reason);
    return { success: true, data };
  }
}
