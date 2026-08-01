import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DatabaseProvider } from '../../database/database.provider';
import { TENANT_CONTEXT_KEY, ROLES } from '../constants';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const tenantContext = (request as any)[TENANT_CONTEXT_KEY];
    const user = request.user as any;

    // SuperAdmin doesn't need tenant context
    if (user?.isSuperAdmin) {
      return true;
    }

    if (!user?.tenantId) {
      throw new UnauthorizedException('User has no tenant context');
    }

    // Prevent tenant escalation: the X-Tenant-Id header must match the user's tenant
    if (tenantContext?.tenantId && tenantContext.tenantId !== user.tenantId) {
      throw new ForbiddenException(
        'Tenant mismatch: header does not match your tenant',
      );
    }

    const tenantId = user.tenantId;

    // Verify subscription is active
    const subResult = await this.db.query(
      `SELECT s.status, s.end_date
       FROM subscriptions s
       WHERE s.tenant_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [tenantId],
    );

    if (!subResult.rows.length) {
      throw new ForbiddenException('No active subscription found');
    }

    const subscription = subResult.rows[0] as {
      status: string;
      end_date: string;
    };

    if (subscription.status !== 'active' && subscription.status !== 'trial') {
      throw new ForbiddenException(`Subscription is ${subscription.status}`);
    }

    if (new Date(subscription.end_date) < new Date()) {
      throw new ForbiddenException('Subscription has expired');
    }

    return true;
  }
}
