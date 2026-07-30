import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatabaseProvider } from '../../database/database.provider';
import { TENANT_CONTEXT_KEY } from '../constants';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly db: DatabaseProvider) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;

    // Public routes or SuperAdmin auth routes don't require a tenant header
    // (tenant comes from JWT in those cases)
    if (!tenantId) {
      req[TENANT_CONTEXT_KEY] = null;
      return next();
    }

    const tenant = await this.db.query(
      `SELECT id, slug, status, is_active FROM tenants WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );

    if (!tenant.rows.length) {
      return next(new Error('Tenant not found'));
    }

    const tenantData = tenant.rows[0] as {
      id: string;
      slug: string;
      status: string;
      is_active: boolean;
    };

    if (!tenantData.is_active) {
      return next(new Error('Tenant is inactive'));
    }

    req[TENANT_CONTEXT_KEY] = {
      tenantId: tenantData.id,
      tenantSlug: tenantData.slug,
      tenantStatus: tenantData.status,
    };

    next();
  }
}
