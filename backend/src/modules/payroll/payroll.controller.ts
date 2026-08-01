import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { ROLES } from '../../common/constants';
import { CreateSalaryComponentDto } from './dto/create-salary-component.dto';
import { ProcessPayrollDto } from './dto/process-payroll.dto';
import { PayrollQueryDto } from './dto/payroll-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Payroll')
@ApiBearerAuth()
@RequiresFeature('payroll')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @AuditLog({ action: 'post_salary_components', module: 'payroll' })
  @Post('salary-components')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Create salary component' })
  async createSalaryComponent(
    @Body() body: CreateSalaryComponentDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createSalaryComponent({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('salary-components')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'List salary components' })
  async getSalaryComponents(@CurrentUser() user: any) {
    const data = await this.service.findSalaryComponentsByBranch(user.branchId);
    return { success: true, data };
  }

  @AuditLog({ action: 'post_process', module: 'payroll' })
  @Post('process')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Process payroll' })
  async processPayroll(
    @Body() body: ProcessPayrollDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.processPayroll({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      processedBy: user.id,
    });
    return { success: true, data };
  }

  @Get()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
    ROLES.PRINCIPAL,
  )
  @ApiOperation({ summary: 'List payroll records' })
  async getPayroll(@CurrentUser() user: any, @Query() query: PayrollQueryDto) {
    const data = await this.service.findPayrollByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Get payroll by ID' })
  async getPayrollById(@Param('id') id: string) {
    const data = await this.service.findPayrollById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_id_status',
    module: 'payroll',
    resourceIdParam: 'id',
  })
  @Put(':id/status')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Update payroll status' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    const data = await this.service.updatePayrollStatus(id, status);
    return { success: true, data };
  }
}
