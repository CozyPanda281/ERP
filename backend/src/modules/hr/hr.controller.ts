import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  CreateStaffDocumentDto,
} from './dto/create-staff.dto';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { ApplyLeaveDto, ReviewLeaveDto } from './dto/apply-leave.dto';
import {
  CreateSalaryComponentDto,
  UpdateSalaryComponentDto,
} from './dto/salary-component.dto';
import { ProcessPayrollDto } from './dto/process-payroll.dto';
import {
  StaffQueryDto,
  LeaveQueryDto,
  PayrollQueryDto,
} from './dto/hr-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('HR')
@ApiBearerAuth()
@Controller('hr')
export class HrController {
  constructor(private readonly service: HrService) {}

  @AuditLog({ action: 'post_staff', module: 'hr' })
  @Post('staff')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create staff member' })
  async createStaff(@Body() body: CreateStaffDto, @CurrentUser() user: any) {
    return {
      success: true,
      data: await this.service.createStaff({
        ...body,
        tenantId: user.tenantId,
        branchId: user.branchId,
      }),
    };
  }

  @Get('staff')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List staff by branch' })
  async getStaff(@CurrentUser() user: any, @Query() query: StaffQueryDto) {
    return {
      success: true,
      data: await this.service.findStaffByBranch(user.branchId, query),
    };
  }

  @Get('staff/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get staff by ID' })
  async getStaffById(@Param('id') id: string, @CurrentUser() user: any) {
    return {
      success: true,
      data: await this.service.findStaffById(id, user.branchId),
    };
  }

  @AuditLog({ action: 'put_staff_id', module: 'hr', resourceIdParam: 'id' })
  @Put('staff/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update staff member' })
  async updateStaff(
    @Param('id') id: string,
    @Body() body: UpdateStaffDto,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.updateStaff(id, user.branchId, body),
    };
  }

  @AuditLog({ action: 'delete_staff_id', module: 'hr', resourceIdParam: 'id' })
  @Delete('staff/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Soft delete staff member' })
  async deleteStaff(@Param('id') id: string, @CurrentUser() user: any) {
    return {
      success: true,
      data: await this.service.deleteStaff(id, user.branchId),
    };
  }

  @AuditLog({
    action: 'post_staff_staffId_documents',
    module: 'hr',
    resourceIdParam: 'id',
  })
  @Post('staff/:staffId/documents')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Add staff document' })
  async addDocument(
    @Param('staffId') staffId: string,
    @Body() body: CreateStaffDocumentDto,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.addStaffDocument(staffId, user.branchId, body),
    };
  }

  @Get('staff/:staffId/documents')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List staff documents' })
  async getDocuments(
    @Param('staffId') staffId: string,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.findStaffDocuments(staffId, user.branchId),
    };
  }

  @AuditLog({
    action: 'delete_staff_staffId_documents_id',
    module: 'hr',
    resourceIdParam: 'id',
  })
  @Delete('staff/:staffId/documents/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Delete staff document' })
  async deleteDocument(
    @Param('staffId') staffId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.deleteStaffDocument(id, staffId, user.branchId),
    };
  }

  @AuditLog({ action: 'post_leave_types', module: 'hr' })
  @Post('leave-types')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create leave type' })
  async createLeaveType(
    @Body() body: CreateLeaveTypeDto,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.createLeaveType({
        ...body,
        tenantId: user.tenantId,
      }),
    };
  }

  @Get('leave-types')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List leave types' })
  async getLeaveTypes(@CurrentUser() user: any) {
    return {
      success: true,
      data: await this.service.findLeaveTypesByTenant(user.tenantId),
    };
  }

  @AuditLog({
    action: 'put_leave_types_id',
    module: 'hr',
    resourceIdParam: 'id',
  })
  @Put('leave-types/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update leave type' })
  async updateLeaveType(
    @Param('id') id: string,
    @Body() body: UpdateLeaveTypeDto,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.updateLeaveType(id, user.tenantId, body),
    };
  }

  @AuditLog({ action: 'post_leave_apply', module: 'hr' })
  @Post('leave/apply')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Apply for leave' })
  async applyLeave(@Body() body: ApplyLeaveDto, @CurrentUser() user: any) {
    return {
      success: true,
      data: await this.service.applyLeave({
        ...body,
        tenantId: user.tenantId,
        branchId: user.branchId,
        staffId: user.staffId || user.id,
      }),
    };
  }

  @Get('leave/mine')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'My leave requests' })
  async getMyLeaves(@CurrentUser() user: any, @Query() query: LeaveQueryDto) {
    return {
      success: true,
      data: await this.service.findMyLeaves(user.staffId || user.id, query),
    };
  }

  @Get('leave')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'All leave requests by branch' })
  async getLeaveRequests(
    @CurrentUser() user: any,
    @Query() query: LeaveQueryDto,
  ) {
    return {
      success: true,
      data: await this.service.findLeaveRequestsByBranch(user.branchId, query),
    };
  }

  @AuditLog({
    action: 'put_leave_id_review',
    module: 'hr',
    resourceIdParam: 'id',
  })
  @Put('leave/:id/review')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Approve or reject leave' })
  async reviewLeave(
    @Param('id') id: string,
    @Body() body: ReviewLeaveDto,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.reviewLeave(
        id,
        user.branchId,
        body.action,
        user.id,
        body.rejectReason,
      ),
    };
  }

  @AuditLog({ action: 'post_salary_components', module: 'hr' })
  @Post('salary-components')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create salary component' })
  async createSalaryComponent(
    @Body() body: CreateSalaryComponentDto,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.createSalaryComponent({
        ...body,
        tenantId: user.tenantId,
        branchId: user.branchId,
      }),
    };
  }

  @Get('salary-components')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List salary components' })
  async getSalaryComponents(@CurrentUser() user: any) {
    return {
      success: true,
      data: await this.service.findSalaryComponents(user.branchId),
    };
  }

  @AuditLog({
    action: 'put_salary_components_id',
    module: 'hr',
    resourceIdParam: 'id',
  })
  @Put('salary-components/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update salary component' })
  async updateSalaryComponent(
    @Param('id') id: string,
    @Body() body: UpdateSalaryComponentDto,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.updateSalaryComponent(id, user.branchId, body),
    };
  }

  @AuditLog({ action: 'post_payroll_process', module: 'hr' })
  @Post('payroll/process')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Process payroll for staff member' })
  async processPayroll(
    @Body() body: ProcessPayrollDto,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.processPayroll({
        ...body,
        tenantId: user.tenantId,
        branchId: user.branchId,
        processedBy: user.id,
      }),
    };
  }

  @Get('payroll')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List payroll records' })
  async getPayrolls(@CurrentUser() user: any, @Query() query: PayrollQueryDto) {
    return {
      success: true,
      data: await this.service.findPayrollsByBranch(user.branchId, query),
    };
  }

  @Get('payroll/staff/:staffId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get payroll history for staff' })
  async getStaffPayrolls(
    @Param('staffId') staffId: string,
    @CurrentUser() user: any,
  ) {
    return {
      success: true,
      data: await this.service.findPayrollsByStaff(staffId, user.branchId),
    };
  }
}
