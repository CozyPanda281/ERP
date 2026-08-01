import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import {
  eq,
  and,
  isNull,
  or,
  desc,
  count,
  sql,
  gte,
  lte,
  min,
  max,
} from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';

export interface AuditLogParams {
  tenantId?: string;
  userId?: string;
  branchId?: string;
  action: string;
  module: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  outcome?: 'success' | 'failure';
}

@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);
  private buffer: AuditLogParams[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor(private readonly db: DatabaseProvider) {}

  async onModuleInit() {
    this.flushInterval = setInterval(
      () => this.flush(),
      this.FLUSH_INTERVAL_MS,
    );

    // Flush on exit
    process.on('SIGTERM', () => this.flush());
    process.on('SIGINT', () => this.flush());

    this.logger.log('AuditService initialized with buffered logging');
  }

  async log(params: AuditLogParams): Promise<void> {
    this.buffer.push(params);

    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }
  }

  async logAction(
    action: string,
    module: string,
    context: {
      tenantId?: string;
      userId?: string;
      branchId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
    resource?: {
      type?: string;
      id?: string;
    },
    changes?: Record<string, unknown>,
    outcome: 'success' | 'failure' = 'success',
  ): Promise<void> {
    await this.log({
      tenantId: context.tenantId,
      userId: context.userId,
      branchId: context.branchId,
      action,
      module,
      resourceType: resource?.type,
      resourceId: resource?.id,
      changes,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      outcome,
    });
  }

  async find(params: {
    tenantId?: string;
    userId?: string;
    action?: string;
    module?: string;
    resourceType?: string;
    resourceId?: string;
    outcome?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const conditions: any[] = [];

    if (params.tenantId) {
      conditions.push(eq(schema.auditLogs.tenantId, params.tenantId));
    }

    if (params.userId) {
      conditions.push(eq(schema.auditLogs.userId, params.userId));
    }

    if (params.action) {
      conditions.push(eq(schema.auditLogs.action, params.action));
    }

    if (params.module) {
      conditions.push(eq(schema.auditLogs.module, params.module));
    }

    if (params.resourceType) {
      conditions.push(eq(schema.auditLogs.resourceType, params.resourceType));
    }

    if (params.resourceId) {
      conditions.push(eq(schema.auditLogs.resourceId, params.resourceId));
    }

    if (params.outcome) {
      conditions.push(eq(schema.auditLogs.outcome, params.outcome));
    }

    if (params.startDate) {
      conditions.push(
        gte(schema.auditLogs.createdAt, new Date(params.startDate)),
      );
    }

    if (params.endDate) {
      conditions.push(
        lte(schema.auditLogs.createdAt, new Date(params.endDate)),
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const countResult = await this.db.db
      .select({ count: count() })
      .from(schema.auditLogs)
      .where(whereClause);

    const total = Number(countResult[0]?.count ?? 0);
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    const result = await this.db.db
      .select({
        ...getTableColumns(schema.auditLogs),
        userName: sql`${schema.users.firstName} || ' ' || ${schema.users.lastName}`,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
      .where(whereClause)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByTenant(tenantId: string, page = 1, limit = 20) {
    return this.find({ tenantId, page, limit });
  }

  async findByUser(userId: string, tenantId?: string, page = 1, limit = 20) {
    return this.find({ userId, tenantId, page, limit });
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
    page = 1,
    limit = 20,
  ) {
    return this.find({ resourceType, resourceId, page, limit });
  }

  async getModuleStats(tenantId?: string) {
    const conditions = tenantId
      ? [eq(schema.auditLogs.tenantId, tenantId)]
      : [];

    const result = await this.db.db
      .select({
        module: schema.auditLogs.module,
        action: schema.auditLogs.action,
        count: count(),
        firstSeen: min(schema.auditLogs.createdAt),
        lastSeen: max(schema.auditLogs.createdAt),
      })
      .from(schema.auditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(schema.auditLogs.module, schema.auditLogs.action)
      .orderBy(schema.auditLogs.module, schema.auditLogs.action);

    return result;
  }

  async getDailyStats(days = 30, tenantId?: string) {
    const conditions: any[] = [
      gte(schema.auditLogs.createdAt, sql`NOW() - ${`${days} days`}::INTERVAL`),
    ];

    if (tenantId) {
      conditions.push(eq(schema.auditLogs.tenantId, tenantId));
    }

    const result = await this.db.db
      .select({
        date: sql`DATE(${schema.auditLogs.createdAt})`,
        count: count(),
        failures: sql`COUNT(*) FILTER (WHERE ${schema.auditLogs.outcome} = 'failure')`,
      })
      .from(schema.auditLogs)
      .where(and(...conditions))
      .groupBy(sql`DATE(${schema.auditLogs.createdAt})`)
      .orderBy(desc(sql`DATE(${schema.auditLogs.createdAt})`));

    return result;
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.BUFFER_SIZE);

    try {
      await this.db.db.insert(schema.auditLogs).values(
        batch.map((entry) => ({
          id: uuidv4(),
          tenantId: entry.tenantId ?? null,
          userId: entry.userId ?? null,
          branchId: entry.branchId ?? null,
          action: entry.action,
          module: entry.module,
          resourceType: entry.resourceType ?? null,
          resourceId: entry.resourceId ?? null,
          description: entry.description ?? null,
          changes: entry.changes ? JSON.stringify(entry.changes) : '{}',
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          sessionId: entry.sessionId ?? null,
        })),
      );
    } catch (error) {
      this.logger.error(
        `Failed to flush audit log batch: ${error instanceof Error ? error.message : error}`,
      );
      // Re-queue failed entries
      this.buffer.unshift(...batch);
    }
  }
}
