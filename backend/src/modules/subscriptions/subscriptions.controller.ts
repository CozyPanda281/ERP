import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ROLES } from '../../common/constants';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SuspendSubscriptionDto } from './dto/suspend-subscription.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // â”€â”€â”€ Plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List all subscription plans' })
  async listPlans() {
    const data = await this.subscriptionsService.listPlans();
    return { success: true, data };
  }

  @Get('plans/:id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get plan by ID' })
  async getPlan(@Param('id') id: string) {
    const data = await this.subscriptionsService.findPlanById(id);
    return { success: true, data };
  }

  @AuditLog({ action: 'post_plans', module: 'subscriptions' })
  @Post('plans')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new subscription plan' })
  async createPlan(@Body() dto: CreatePlanDto) {
    const data = await this.subscriptionsService.createPlan(dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_plans_id',
    module: 'subscriptions',
    resourceIdParam: 'id',
  })
  @Put('plans/:id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a subscription plan' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    const data = await this.subscriptionsService.updatePlan(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_plans_id',
    module: 'subscriptions',
    resourceIdParam: 'id',
  })
  @Delete('plans/:id')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate a subscription plan' })
  async deletePlan(@Param('id') id: string) {
    const data = await this.subscriptionsService.deletePlan(id);
    return { success: true, ...data };
  }

  // â”€â”€â”€ Tenant Subscriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('tenant/:tenantId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get current subscription for a tenant' })
  async getTenantSubscription(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: any,
  ) {
    if (!user.isSuperAdmin && user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'You can only view your own tenant subscription',
      );
    }
    const data =
      await this.subscriptionsService.getTenantSubscription(tenantId);
    return { success: true, data };
  }

  @AuditLog({ action: 'post_assign', module: 'subscriptions' })
  @Post('assign')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign a subscription plan to a tenant' })
  async assignSubscription(@Body() dto: AssignSubscriptionDto) {
    const data = await this.subscriptionsService.assignSubscription(dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_renew_tenantId',
    module: 'subscriptions',
    resourceIdParam: 'id',
  })
  @Post('renew/:tenantId')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Renew subscription for a tenant' })
  async renewSubscription(@Param('tenantId') tenantId: string) {
    const data = await this.subscriptionsService.renewSubscription(tenantId);
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_change_plan_tenantId',
    module: 'subscriptions',
    resourceIdParam: 'id',
  })
  @Post('change-plan/:tenantId')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Change plan for a tenant' })
  async changePlan(
    @Param('tenantId') tenantId: string,
    @Body() dto: ChangePlanDto,
  ) {
    const data = await this.subscriptionsService.changePlan(
      tenantId,
      dto.planId,
    );
    return { success: true, data };
  }

  @AuditLog({
    action: 'post_suspend_tenantId',
    module: 'subscriptions',
    resourceIdParam: 'id',
  })
  @Post('suspend/:tenantId')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend a tenant subscription' })
  async suspendSubscription(
    @Param('tenantId') tenantId: string,
    @Body() dto: SuspendSubscriptionDto,
  ) {
    const data = await this.subscriptionsService.suspendSubscription(
      tenantId,
      dto.reason,
    );
    return { success: true, ...data };
  }

  @AuditLog({
    action: 'post_cancel_tenantId',
    module: 'subscriptions',
    resourceIdParam: 'id',
  })
  @Post('cancel/:tenantId')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel a tenant subscription' })
  async cancelSubscription(@Param('tenantId') tenantId: string) {
    const data = await this.subscriptionsService.cancelSubscription(tenantId);
    return { success: true, ...data };
  }

  // â”€â”€â”€ Plan Limit Checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('limits/:tenantId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Check current usage vs plan limits' })
  async getLimits(@Param('tenantId') tenantId: string) {
    const limits = await this.subscriptionsService.getTenantLimits(tenantId);
    const [branches, users, students, staff] = await Promise.all([
      this.subscriptionsService.canCreateBranch(tenantId),
      this.subscriptionsService.canAddUser(tenantId),
      this.subscriptionsService.canAddStudent(tenantId),
      this.subscriptionsService.canAddStaff(tenantId),
    ]);

    return {
      success: true,
      data: {
        limits,
        canCreateBranch: branches,
        canAddUser: users,
        canAddStudent: students,
        canAddStaff: staff,
      },
    };
  }

  // â”€â”€â”€ Admin & Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('admin/all')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all subscriptions (SuperAdmin)' })
  async listAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.subscriptionsService.listAllSubscriptions(page, limit);
  }

  @Get('admin/expiring')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get expiring subscriptions' })
  async getExpiring(@Query('days') days: number = 30) {
    const data = await this.subscriptionsService.getExpiringSubscriptions(days);
    return { success: true, data };
  }

  @Get('admin/stats')
  @Roles(ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Subscription statistics' })
  async getStats() {
    const data = await this.subscriptionsService.getSubscriptionStats();
    return { success: true, data };
  }
}
