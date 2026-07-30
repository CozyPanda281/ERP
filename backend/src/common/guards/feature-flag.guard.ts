import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { FeatureFlagsService } from '../../modules/feature-flags/feature-flags.service';
import { FEATURE_KEY } from '../decorators/requires-feature.decorator';
import { TENANT_CONTEXT_KEY } from '../constants';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const tenantContext = (request as any)[TENANT_CONTEXT_KEY];
    const user = request.user as any;

    // SuperAdmin bypasses feature checks
    if (user?.isSuperAdmin) return true;

    const tenantId = tenantContext?.tenantId || user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for feature check');
    }

    const isEnabled = await this.featureFlagsService.isFeatureEnabled(
      tenantId,
      requiredFeature,
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        `Feature '${requiredFeature}' is not available on your current plan`,
      );
    }

    return true;
  }
}
