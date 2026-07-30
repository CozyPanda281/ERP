import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, isNull, or, desc, sql, inArray } from 'drizzle-orm';

interface FeatureCache {
  [tenantId: string]: {
    [featureCode: string]: {
      enabled: boolean;
      cachedAt: number;
    };
  };
}

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private cache: FeatureCache = {};
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly db: DatabaseProvider) {}

  async onModuleInit() {
    this.logger.log('FeatureFlagsService initialized');
  }

  async isFeatureEnabled(
    tenantId: string,
    featureCode: string,
  ): Promise<boolean> {
    const cached = this.getFromCache(tenantId, featureCode);
    if (cached !== undefined) return cached;

    const enabled = await this.resolveFeature(tenantId, featureCode);
    this.setCache(tenantId, featureCode, enabled);
    return enabled;
  }

  async getEnabledFeatures(tenantId: string): Promise<string[]> {
    const subRows = await this.db.db
      .select({ planId: schema.subscriptions.planId })
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.tenantId, tenantId),
          inArray(schema.subscriptions.status, ['active', 'trial']),
        ),
      )
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);

    if (!subRows.length) return [];

    const planId = subRows[0].planId;

    const result = await this.db.db
      .select({
        code: schema.featureFlags.code,
        isEnabled:
          sql<boolean>`COALESCE(${schema.tenantFeatures.isEnabled}, ${schema.planFeatures.isEnabled}, ${schema.featureFlags.defaultValue})`,
      })
      .from(schema.featureFlags)
      .leftJoin(
        schema.planFeatures,
        and(
          eq(schema.planFeatures.planId, planId),
          eq(schema.planFeatures.featureFlagId, schema.featureFlags.id),
        ),
      )
      .leftJoin(
        schema.tenantFeatures,
        and(
          eq(schema.tenantFeatures.tenantId, tenantId),
          eq(schema.tenantFeatures.featureFlagId, schema.featureFlags.id),
        ),
      )
      .where(
        or(
          isNull(schema.tenantFeatures.overridePlan),
          eq(schema.tenantFeatures.overridePlan, false),
        ),
      )
      .orderBy(schema.featureFlags.module, schema.featureFlags.code);

    return result
      .filter((r) => r.isEnabled)
      .map((r) => r.code);
  }

  async setTenantOverride(
    tenantId: string,
    featureCode: string,
    enabled: boolean,
    overridePlan = false,
  ): Promise<void> {
    const featureResult = await this.db.db
      .select({ id: schema.featureFlags.id })
      .from(schema.featureFlags)
      .where(eq(schema.featureFlags.code, featureCode))
      .limit(1);

    if (!featureResult.length) {
      throw new Error(`Feature flag '${featureCode}' not found`);
    }

    const featureId = featureResult[0].id;

    await this.db.db
      .insert(schema.tenantFeatures)
      .values({
        tenantId,
        featureFlagId: featureId,
        isEnabled: enabled,
        overridePlan,
      })
      .onConflictDoUpdate({
        target: [
          schema.tenantFeatures.tenantId,
          schema.tenantFeatures.featureFlagId,
        ],
        set: {
          isEnabled: enabled,
          overridePlan,
          updatedAt: new Date(),
        },
      });

    this.bustCache(tenantId, featureCode);
  }

  async getPlanFeatures(planId: string): Promise<Record<string, boolean>> {
    const result = await this.db.db
      .select({
        code: schema.featureFlags.code,
        isEnabled:
          sql<boolean>`COALESCE(${schema.planFeatures.isEnabled}, ${schema.featureFlags.defaultValue})`,
      })
      .from(schema.featureFlags)
      .leftJoin(
        schema.planFeatures,
        and(
          eq(schema.planFeatures.planId, planId),
          eq(schema.planFeatures.featureFlagId, schema.featureFlags.id),
        ),
      )
      .orderBy(schema.featureFlags.module, schema.featureFlags.code);

    return result.reduce(
      (acc: Record<string, boolean>, r) => {
        acc[r.code] = r.isEnabled;
        return acc;
      },
      {},
    );
  }

  async updatePlanFeature(
    planId: string,
    featureCode: string,
    enabled: boolean,
  ): Promise<void> {
    const featureResult = await this.db.db
      .select({ id: schema.featureFlags.id })
      .from(schema.featureFlags)
      .where(eq(schema.featureFlags.code, featureCode))
      .limit(1);

    if (!featureResult.length) {
      throw new Error(`Feature flag '${featureCode}' not found`);
    }

    const featureId = featureResult[0].id;

    await this.db.db
      .insert(schema.planFeatures)
      .values({
        planId,
        featureFlagId: featureId,
        isEnabled: enabled,
      })
      .onConflictDoUpdate({
        target: [
          schema.planFeatures.planId,
          schema.planFeatures.featureFlagId,
        ],
        set: { isEnabled: enabled },
      });
  }

  private async resolveFeature(
    tenantId: string,
    featureCode: string,
  ): Promise<boolean> {
    const subRows = await this.db.db
      .select({ planId: schema.subscriptions.planId })
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.tenantId, tenantId),
          inArray(schema.subscriptions.status, ['active', 'trial']),
        ),
      )
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);

    if (!subRows.length) return false;

    const planId = subRows[0].planId;

    const result = await this.db.db
      .select({
        isEnabled:
          sql<boolean>`COALESCE(${schema.tenantFeatures.isEnabled}, ${schema.planFeatures.isEnabled}, ${schema.featureFlags.defaultValue})`,
        overridePlan: schema.tenantFeatures.overridePlan,
      })
      .from(schema.featureFlags)
      .leftJoin(
        schema.planFeatures,
        and(
          eq(schema.planFeatures.planId, planId),
          eq(schema.planFeatures.featureFlagId, schema.featureFlags.id),
        ),
      )
      .leftJoin(
        schema.tenantFeatures,
        and(
          eq(schema.tenantFeatures.tenantId, tenantId),
          eq(schema.tenantFeatures.featureFlagId, schema.featureFlags.id),
        ),
      )
      .where(
        and(
          eq(schema.featureFlags.code, featureCode),
          or(
            isNull(schema.tenantFeatures.overridePlan),
            eq(schema.tenantFeatures.overridePlan, false),
          ),
        ),
      );

    if (!result.length) {
      return false;
    }

    const row = result[0];

    return row.isEnabled;
  }

  private getFromCache(
    tenantId: string,
    featureCode: string,
  ): boolean | undefined {
    const tenantCache = this.cache[tenantId];
    if (!tenantCache) return undefined;

    const entry = tenantCache[featureCode];
    if (!entry) return undefined;

    if (Date.now() - entry.cachedAt > this.CACHE_TTL_MS) {
      delete tenantCache[featureCode];
      return undefined;
    }

    return entry.enabled;
  }

  private setCache(
    tenantId: string,
    featureCode: string,
    enabled: boolean,
  ): void {
    if (!this.cache[tenantId]) {
      this.cache[tenantId] = {};
    }
    this.cache[tenantId][featureCode] = {
      enabled,
      cachedAt: Date.now(),
    };
  }

  private bustCache(tenantId: string, featureCode?: string): void {
    if (featureCode) {
      if (this.cache[tenantId]) {
        delete this.cache[tenantId][featureCode];
      }
    } else {
      delete this.cache[tenantId];
    }
  }
}
