import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { DatabaseProvider } from '../../database/database.provider';
import { TENANT_CONTEXT_KEY } from '../constants';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly db: DatabaseProvider) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantContext = (request as any)[TENANT_CONTEXT_KEY];
    const user = request.user as any;

    const tenantId = tenantContext?.tenantId || user?.tenantId;
    const userId = user?.sub || user?.id;
    const branchId = user?.branchId;
    const sessionId = user?.sessionId;
    const ipAddress = request.ip || request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'] || '';

    // Set PostgreSQL session variables for RLS policies
    if (tenantId) {
      this.db.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [
          tenantId,
        ]);
    }

    if (userId) {
      this.db.query(`SELECT set_config('app.current_user_id', $1, TRUE)`, [
        userId,
      ]);
    }

    if (branchId) {
      this.db.query(`SELECT set_config('app.current_branch_id', $1, TRUE)`, [
        branchId,
      ]);
    }

    if (sessionId) {
      this.db.query(
        `SELECT set_config('app.current_session_id', $1, TRUE)`,
        [sessionId],
      );
    }

    if (user?.isSuperAdmin) {
      this.db.query(`SELECT set_config('app.is_superadmin', 'true', TRUE)`);
    }

    this.db.query(`SELECT set_config('app.client_ip', $1, TRUE)`, [ipAddress]);

    this.db.query(`SELECT set_config('app.user_agent', $1, TRUE)`, [
      userAgent,
    ]);

    return next.handle().pipe(
      tap({
        error: () => {
          // Reset on error to prevent context leakage
          this.db.query(`SELECT set_config('app.current_tenant_id', '', TRUE)`);
        },
      }),
    );
  }
}
