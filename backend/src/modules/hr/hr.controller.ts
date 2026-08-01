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

@ApiTags('HR')
@ApiBearerAuth()
@Controller('hr')
export class HrController {
  constructor(private readonly service: HrService) {}

  @Post('staff')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create staff member' })
  async createStaff(@Body() body: CreateStaffDto, @CurrentUser() user: any) {
    return this.service.createStaff({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
  }

  @Get('staff')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List staff by branch' })
  async getStaff(@CurrentUser() user: any, @Query() query: StaffQueryDto) {
    return this.service.findStaffByBranch(user.branchId, query);
  }

  @Get('staff/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get staff by ID' })
  async getStaffById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findStaffById(id, user.branchId);
  }

  @Put('staff/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update staff member' })
  async updateStaff(
    @Param('id') id: string,
    @Body() body: UpdateStaffDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateStaff(id, user.branchId, body);
  }

  @Delete('staff/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Soft delete staff member' })
  async deleteStaff(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteStaff(id, user.branchId);
  }

  @Post('staff/:staffId/documents')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Add staff document' })
  async addDocument(
    @Param('staffId') staffId: string,
    @Body() body: CreateStaffDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.addStaffDocument(staffId, user.branchId, body);
  }

  @Get('staff/:staffId/documents')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List staff documents' })
  async getDocuments(
    @Param('staffId') staffId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findStaffDocuments(staffId, user.branchId);
  }

  @Delete('staff/:staffId/documents/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Delete staff document' })
  async deleteDocument(
    @Param('staffId') staffId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.deleteStaffDocument(id, staffId, user.branchId);
  }

  @Post('leave-types')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create leave type' })
  async createLeaveType(
    @Body() body: CreateLeaveTypeDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createLeaveType({ ...body, tenantId: user.tenantId });
  }

  @Get('leave-types')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List leave types' })
  async getLeaveTypes(@CurrentUser() user: any) {
    return this.service.findLeaveTypesByTenant(user.tenantId);
  }

  @Put('leave-types/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update leave type' })
  async updateLeaveType(
    @Param('id') id: string,
    @Body() body: UpdateLeaveTypeDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateLeaveType(id, user.tenantId, body);
  }

  @Post('leave/apply')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Apply for leave' })
  async applyLeave(@Body() body: ApplyLeaveDto, @CurrentUser() user: any) {
    return this.service.applyLeave({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      staffId: user.staffId || user.id,
    });
  }

  @Get('leave/mine')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'My leave requests' })
  async getMyLeaves(@CurrentUser() user: any, @Query() query: LeaveQueryDto) {
    return this.service.findMyLeaves(user.staffId || user.id, query);
  }

  @Get('leave')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'All leave requests by branch' })
  async getLeaveRequests(
    @CurrentUser() user: any,
    @Query() query: LeaveQueryDto,
  ) {
    return this.service.findLeaveRequestsByBranch(user.branchId, query);
  }

  @Put('leave/:id/review')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Approve or reject leave' })
  async reviewLeave(
    @Param('id') id: string,
    @Body() body: ReviewLeaveDto,
    @CurrentUser() user: any,
  ) {
    return this.service.reviewLeave(
      id,
      user.branchId,
      body.action,
      user.id,
      body.rejectReason,
    );
  }

  @Post('salary-components')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Create salary component' })
  async createSalaryComponent(
    @Body() body: CreateSalaryComponentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createSalaryComponent({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
  }

  @Get('salary-components')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List salary components' })
  async getSalaryComponents(@CurrentUser() user: any) {
    return this.service.findSalaryComponents(user.branchId);
  }

  @Put('salary-components/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Update salary component' })
  async updateSalaryComponent(
    @Param('id') id: string,
    @Body() body: UpdateSalaryComponentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateSalaryComponent(id, user.branchId, body);
  }

  @Post('payroll/process')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Process payroll for staff member' })
  async processPayroll(
    @Body() body: ProcessPayrollDto,
    @CurrentUser() user: any,
  ) {
    return this.service.processPayroll({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      processedBy: user.id,
    });
  }

  @Get('payroll')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List payroll records' })
  async getPayrolls(@CurrentUser() user: any, @Query() query: PayrollQueryDto) {
    return this.service.findPayrollsByBranch(user.branchId, query);
  }

  @Get('payroll/staff/:staffId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get payroll history for staff' })
  async getStaffPayrolls(
    @Param('staffId') staffId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findPayrollsByStaff(staffId, user.branchId);
  }
}
