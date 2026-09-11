import {
  Injectable,
  Logger,
  NestMiddleware,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatabaseProvider } from '../../database/database.provider';
import { tenantAls } from '../../database/database.provider';
import { TENANT_CONTEXT_KEY } from '../constants';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly db: DatabaseProvider) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Create the request's RLS GUC context. Everything downstream (guards,
    // interceptors, handler, audit writes) inherits it; it dies with the
    // request, so pooled connections can never leak another request's tenant.
    const gucs = new Map<string, string>();
    tenantAls.run(gucs, () => {
      this.resolveTenant(req, res, next).catch(next);
    });
  }

  private async resolveTenant(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
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
      return next(new NotFoundException('Tenant not found'));
    }

    const tenantData = tenant.rows[0] as {
      id: string;
      slug: string;
      status: string;
      is_active: boolean;
    };

    if (
      !tenantData.is_active ||
      tenantData.status === 'suspended' ||
      tenantData.status === 'cancelled'
    ) {
      return next(new ForbiddenException('Tenant is inactive'));
    }

    req[TENANT_CONTEXT_KEY] = {
      tenantId: tenantData.id,
      tenantSlug: tenantData.slug,
      tenantStatus: tenantData.status,
    };

    // Expose the validated tenant to the request's RLS context.
    const gucs = tenantAls.getStore();
    gucs?.set('app.tenant_id', tenantData.id);
    gucs?.set('app.current_tenant_id', tenantData.id);

    next();
  }
}
