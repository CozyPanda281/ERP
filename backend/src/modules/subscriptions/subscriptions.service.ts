import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import {
  eq,
  and,
  isNull,
  desc,
  asc,
  count,
  sql,
  inArray,
  gte,
  lte,
} from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly db: DatabaseProvider) {}

  // ─── Plan Management ─────────────────────────────────────────────────────

  async createPlan(params: {
    name: string;
    code: string;
    description?: string;
    priceMonthly: number;
    priceYearly: number;
    maxBranches: number;
    maxUsers: number;
    maxStudents: number;
    maxStaff: number;
    storageLimitMb: number;
    features?: Record<string, boolean>;
    sortOrder?: number;
  }) {
    const existing = await this.db.db
      .select({ id: schema.plans.id })
      .from(schema.plans)
      .where(eq(schema.plans.code, params.code))
      .limit(1);

    if (existing.length) {
      throw new ConflictException(`Plan code '${params.code}' already exists`);
    }

    const planId = uuidv4();

    await this.db.db.insert(schema.plans).values({
      id: planId,
      name: params.name,
      code: params.code,
      description: params.description ?? null,
      priceMonthly: String(params.priceMonthly),
      priceYearly: String(params.priceYearly),
      maxBranches: params.maxBranches,
      maxUsers: params.maxUsers,
      maxStudents: params.maxStudents,
      maxStaff: params.maxStaff,
      storageLimitMb: params.storageLimitMb,
      features: params.features ?? {},
      sortOrder: params.sortOrder ?? 0,
    });

    return this.findPlanById(planId);
  }

  async updatePlan(
    planId: string,
    params: Partial<{
      name: string;
      description: string;
      priceMonthly: number;
      priceYearly: number;
      maxBranches: number;
      maxUsers: number;
      maxStudents: number;
      maxStaff: number;
      storageLimitMb: number;
      features: Record<string, boolean>;
      isActive: boolean;
    }>,
  ) {
    const plan = await this.findPlanById(planId);

    const updatedParams = {
      name: params.name ?? plan.name,
      description: params.description ?? plan.description,
      priceMonthly: params.priceMonthly ?? Number(plan.priceMonthly),
      priceYearly: params.priceYearly ?? Number(plan.priceYearly),
      maxBranches: params.maxBranches ?? plan.maxBranches,
      maxUsers: params.maxUsers ?? plan.maxUsers,
      maxStudents: params.maxStudents ?? plan.maxStudents,
      maxStaff: params.maxStaff ?? plan.maxStaff,
      storageLimitMb: params.storageLimitMb ?? plan.storageLimitMb,
      features: params.features ?? plan.features,
      isActive: params.isActive ?? plan.isActive,
    };

    await this.db.db
      .update(schema.plans)
      .set({
        name: updatedParams.name,
        description: updatedParams.description,
        priceMonthly: String(updatedParams.priceMonthly),
        priceYearly: String(updatedParams.priceYearly),
        maxBranches: updatedParams.maxBranches,
        maxUsers: updatedParams.maxUsers,
        maxStudents: updatedParams.maxStudents,
        maxStaff: updatedParams.maxStaff,
        storageLimitMb: updatedParams.storageLimitMb,
        features: updatedParams.features,
        isActive: updatedParams.isActive,
        updatedAt: new Date(),
      })
      .where(eq(schema.plans.id, planId));

    return this.findPlanById(planId);
  }

  async listPlans() {
    return this.db.db
      .select()
      .from(schema.plans)
      .orderBy(asc(schema.plans.sortOrder), asc(schema.plans.name));
  }

  async findPlanById(planId: string) {
    const result = await this.db.db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, planId))
      .limit(1);

    if (!result.length) {
      throw new NotFoundException('Plan not found');
    }

    return result[0];
  }

  async findPlanByCode(code: string) {
    const result = await this.db.db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.code, code))
      .limit(1);

    if (!result.length) {
      throw new NotFoundException(`Plan '${code}' not found`);
    }

    return result[0];
  }

  async deletePlan(planId: string) {
    const subs = await this.db.db
      .select({ count: count() })
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.planId, planId),
          inArray(schema.subscriptions.status, ['active', 'trial']),
        ),
      );

    if (Number(subs[0]?.count ?? 0) > 0) {
      throw new ConflictException(
        'Cannot delete plan with active subscriptions. Deactivate it instead.',
      );
    }

    await this.db.db
      .update(schema.plans)
      .set({ isActive: false })
      .where(eq(schema.plans.id, planId));

    return { message: 'Plan deactivated' };
  }

  // ─── Subscription Lifecycle ──────────────────────────────────────────────

  async assignSubscription(params: {
    tenantId: string;
    planId: string;
    billingCycle?: 'monthly' | 'yearly';
    trialDays?: number;
  }) {
    const plan = await this.findPlanById(params.planId);
    const subscriptionId = uuidv4();

    const startDate = new Date();
    let endDate: Date;

    if (params.trialDays && params.trialDays > 0) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + params.trialDays);

      await this.db.db.insert(schema.subscriptions).values({
        id: subscriptionId,
        tenantId: params.tenantId,
        planId: params.planId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        billingCycle: params.billingCycle || 'monthly',
        status: 'trial',
        trialEndsAt: endDate.toISOString().split('T')[0],
      });
    } else {
      const billingCycle = params.billingCycle || 'monthly';
      endDate = new Date(startDate);
      if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      await this.db.db.insert(schema.subscriptions).values({
        id: subscriptionId,
        tenantId: params.tenantId,
        planId: params.planId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        billingCycle,
        status: 'active',
      });
    }

    // Update tenant limits from plan
    await this.db.db
      .update(schema.tenants)
      .set({
        maxBranches: plan.maxBranches,
        maxUsers: plan.maxUsers,
        maxStudents: plan.maxStudents,
        maxStaff: plan.maxStaff,
        storageLimitMb: plan.storageLimitMb,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, params.tenantId));

    return this.getTenantSubscription(params.tenantId);
  }

  async renewSubscription(tenantId: string) {
    const sub = await this.getTenantSubscription(tenantId);

    if (!sub || sub.status === 'cancelled') {
      throw new BadRequestException('Cannot renew cancelled subscription');
    }

    const currentEnd = new Date(sub.endDate);
    let newEnd: Date;

    if (sub.billingCycle === 'yearly') {
      newEnd = new Date(currentEnd);
      newEnd.setFullYear(newEnd.getFullYear() + 1);
    } else {
      newEnd = new Date(currentEnd);
      newEnd.setMonth(newEnd.getMonth() + 1);
    }

    await this.db.db
      .update(schema.subscriptions)
      .set({
        endDate: newEnd.toISOString().split('T')[0],
        status: 'active',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.subscriptions.tenantId, tenantId),
          inArray(schema.subscriptions.status, ['active', 'expired']),
        ),
      );

    this.logger.log(`Subscription renewed for tenant ${tenantId}`);

    return this.getTenantSubscription(tenantId);
  }

  async suspendSubscription(tenantId: string, reason?: string) {
    await this.db.db
      .update(schema.subscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(
        and(
          eq(schema.subscriptions.tenantId, tenantId),
          eq(schema.subscriptions.status, 'active'),
        ),
      );

    await this.db.db
      .update(schema.tenants)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, tenantId));

    this.logger.warn(
      `Subscription suspended for tenant ${tenantId}: ${reason || 'No reason'}`,
    );

    return { message: 'Subscription suspended', tenantId };
  }

  async cancelSubscription(tenantId: string) {
    await this.db.db
      .update(schema.subscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        autoRenew: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.subscriptions.tenantId, tenantId),
          inArray(schema.subscriptions.status, ['active', 'trial']),
        ),
      );

    return { message: 'Subscription cancelled', tenantId };
  }

  async changePlan(tenantId: string, newPlanId: string) {
    const plan = await this.findPlanById(newPlanId);

    const subResult = await this.db.db
      .select({
        id: schema.subscriptions.id,
        endDate: schema.subscriptions.endDate,
      })
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.tenantId, tenantId),
          inArray(schema.subscriptions.status, ['active', 'trial']),
        ),
      )
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);

    if (!subResult.length) {
      throw new NotFoundException('No active subscription found');
    }

    const currentSub = subResult[0];

    await this.db.db
      .update(schema.subscriptions)
      .set({
        planId: newPlanId,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.id, currentSub.id));

    // Update tenant limits
    await this.db.db
      .update(schema.tenants)
      .set({
        maxBranches: plan.maxBranches,
        maxUsers: plan.maxUsers,
        maxStudents: plan.maxStudents,
        maxStaff: plan.maxStaff,
        storageLimitMb: plan.storageLimitMb,
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, tenantId));

    this.logger.log(`Plan changed for tenant ${tenantId} to ${plan.code}`);

    return this.getTenantSubscription(tenantId);
  }

  async getTenantSubscription(tenantId: string) {
    const result = await this.db.db
      .select({
        ...getTableColumns(schema.subscriptions),
        planName: schema.plans.name,
        planCode: schema.plans.code,
        maxBranches: schema.plans.maxBranches,
        maxUsers: schema.plans.maxUsers,
        maxStudents: schema.plans.maxStudents,
        maxStaff: schema.plans.maxStaff,
        storageLimitMb: schema.plans.storageLimitMb,
        planFeatures: schema.plans.features,
      })
      .from(schema.subscriptions)
      .innerJoin(schema.plans, eq(schema.plans.id, schema.subscriptions.planId))
      .where(eq(schema.subscriptions.tenantId, tenantId))
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);

    if (!result.length) return null;
    return result[0];
  }

  // ─── Plan Limit Checks ───────────────────────────────────────────────────

  async canCreateBranch(tenantId: string): Promise<boolean> {
    const limits = await this.getTenantLimits(tenantId);
    if (!limits) return false;

    const countResult = await this.db.db
      .select({ count: count() })
      .from(schema.branches)
      .where(
        and(
          eq(schema.branches.tenantId, tenantId),
          isNull(schema.branches.deletedAt),
        ),
      );

    const currentCount = Number(countResult[0]?.count ?? 0);
    return currentCount < (limits.maxBranches ?? 0);
  }

  async canAddUser(tenantId: string): Promise<boolean> {
    const limits = await this.getTenantLimits(tenantId);
    if (!limits) return false;

    const countResult = await this.db.db
      .select({ count: count() })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, tenantId),
          isNull(schema.users.deletedAt),
        ),
      );

    const currentCount = Number(countResult[0]?.count ?? 0);
    return currentCount < (limits.maxUsers ?? 0);
  }

  async canAddStudent(tenantId: string): Promise<boolean> {
    const limits = await this.getTenantLimits(tenantId);
    if (!limits) return false;

    const countResult = await this.db.db
      .select({ count: count() })
      .from(schema.students)
      .where(
        and(
          eq(schema.students.tenantId, tenantId),
          isNull(schema.students.deletedAt),
        ),
      );

    const currentCount = Number(countResult[0]?.count ?? 0);
    return currentCount < (limits.maxStudents ?? 0);
  }

  async canAddStaff(tenantId: string): Promise<boolean> {
    const limits = await this.getTenantLimits(tenantId);
    if (!limits) return false;

    const countResult = await this.db.db
      .select({ count: count() })
      .from(schema.staff)
      .where(
        and(
          eq(schema.staff.tenantId, tenantId),
          isNull(schema.staff.deletedAt),
        ),
      );

    const currentCount = Number(countResult[0]?.count ?? 0);
    return currentCount < (limits.maxStaff ?? 0);
  }

  async getTenantLimits(tenantId: string) {
    const sub = await this.getTenantSubscription(tenantId);
    if (!sub) return null;

    return {
      maxBranches: sub.maxBranches ?? 0,
      maxUsers: sub.maxUsers ?? 0,
      maxStudents: sub.maxStudents ?? 0,
      maxStaff: sub.maxStaff ?? 0,
      storageLimitMb: sub.storageLimitMb ?? 0,
    };
  }

  async assertCanCreateBranch(tenantId: string): Promise<void> {
    const allowed = await this.canCreateBranch(tenantId);
    if (!allowed) {
      throw new BadRequestException(
        'Branch limit reached for your subscription plan',
      );
    }
  }

  async assertCanAddUser(tenantId: string): Promise<void> {
    const allowed = await this.canAddUser(tenantId);
    if (!allowed) {
      throw new BadRequestException(
        'User limit reached for your subscription plan',
      );
    }
  }

  async assertCanAddStudent(tenantId: string): Promise<void> {
    const allowed = await this.canAddStudent(tenantId);
    if (!allowed) {
      throw new BadRequestException(
        'Student limit reached for your subscription plan',
      );
    }
  }

  async assertCanAddStaff(tenantId: string): Promise<void> {
    const allowed = await this.canAddStaff(tenantId);
    if (!allowed) {
      throw new BadRequestException(
        'Staff limit reached for your subscription plan',
      );
    }
  }

  // ─── Admin & Reporting ───────────────────────────────────────────────────

  async listAllSubscriptions(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const result = await this.db.db
      .select({
        ...getTableColumns(schema.subscriptions),
        tenantName: schema.tenants.name,
        tenantSlug: schema.tenants.slug,
        planName: schema.plans.name,
        planCode: schema.plans.code,
      })
      .from(schema.subscriptions)
      .innerJoin(
        schema.tenants,
        eq(schema.tenants.id, schema.subscriptions.tenantId),
      )
      .innerJoin(schema.plans, eq(schema.plans.id, schema.subscriptions.planId))
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db.db
      .select({ count: count() })
      .from(schema.subscriptions);

    return {
      data: result,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count ?? 0),
      },
    };
  }

  async getExpiringSubscriptions(daysWithin = 30) {
    const result = await this.db.db
      .select({
        ...getTableColumns(schema.subscriptions),
        tenantName: schema.tenants.name,
        tenantEmail: schema.tenants.email,
      })
      .from(schema.subscriptions)
      .innerJoin(
        schema.tenants,
        eq(schema.tenants.id, schema.subscriptions.tenantId),
      )
      .where(
        and(
          eq(schema.subscriptions.status, 'active'),
          gte(schema.subscriptions.endDate, sql`NOW()`),
          lte(
            schema.subscriptions.endDate,
            sql`NOW() + ${`${daysWithin} days`}::INTERVAL`,
          ),
        ),
      )
      .orderBy(asc(schema.subscriptions.endDate));

    return result;
  }

  async getSubscriptionStats() {
    const result = await this.db.db
      .select({
        activeCount: sql`COUNT(*) FILTER (WHERE ${schema.subscriptions.status} = 'active')`,
        trialCount: sql`COUNT(*) FILTER (WHERE ${schema.subscriptions.status} = 'trial')`,
        expiredCount: sql`COUNT(*) FILTER (WHERE ${schema.subscriptions.status} = 'expired')`,
        cancelledCount: sql`COUNT(*) FILTER (WHERE ${schema.subscriptions.status} = 'cancelled')`,
        overdueCount: sql`COUNT(*) FILTER (WHERE ${schema.subscriptions.endDate} < NOW() AND ${schema.subscriptions.status} = 'active')`,
      })
      .from(schema.subscriptions);

    return result[0];
  }
}
