import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, defer } from 'rxjs';
import { Request } from 'express';
import { tenantAls } from '../../database/database.provider';
import { TENANT_CONTEXT_KEY } from '../constants';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantContext = (request as any)[TENANT_CONTEXT_KEY];
    const user = request.user as any;

    const tenantId = tenantContext?.tenantId || user?.tenantId;
    const userId = user?.sub || user?.id;
    const branchId = user?.branchId;
    const sessionId = user?.sessionId;

    // Mutate the request-scoped RLS GUC context (created by TenantMiddleware).
    // The GucAwarePool applies these atomically on the query's connection, so
    // RLS policies always see this request's tenant — never another request's.
    const applyGucs = () => {
      const gucs = tenantAls.getStore();
      if (!gucs) return;
      if (tenantId) {
        gucs.set('app.tenant_id', tenantId);
        gucs.set('app.current_tenant_id', tenantId);
      }
      if (userId) gucs.set('app.current_user_id', userId);
      if (branchId) gucs.set('app.current_branch_id', branchId);
      if (sessionId) gucs.set('app.current_session_id', sessionId);
      if (user?.isSuperAdmin) gucs.set('app.is_superadmin', 'true');
      // Pre-auth flows (login, refresh, forgot/reset password) query users,
      // roles, user_sessions and audit_logs with no tenant context. Allow
      // them ONLY on the public auth routes.
      if (
        !user &&
        /\/auth\/(login|refresh|forgot-password|reset-password|2fa\/login)(\/|\?|$)/.test(
          request.path || '',
        )
      ) {
        gucs.set('app.allow_auth_lookup', 'true');
      }
    };

    // If the middleware did not run (tests, direct invocation), create a
    // request-scoped context here.
    if (!tenantAls.getStore()) {
      return defer(() =>
        tenantAls.run(new Map<string, string>(), () => {
          applyGucs();
          return next.handle();
        }),
      );
    }
    applyGucs();
    return next.handle();
  }
}
