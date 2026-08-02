import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize, switchMap, from } from 'rxjs';
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

    // Set PostgreSQL session variables for RLS policies (session-level so they
    // persist for the request's queries; reset in finalize to prevent leakage
    // across requests on pooled connections).
    const setConfigs: Promise<unknown>[] = [];

    if (tenantId) {
      setConfigs.push(
        this.db.query(
          `SELECT set_config('app.current_tenant_id', $1, FALSE)`,
          [tenantId],
        ),
      );
      // Alias used by the RLS policies (tenant_isolation) — kept in sync so
      // policies work even if the app connects as a non-owner role.
      setConfigs.push(
        this.db.query(`SELECT set_config('app.tenant_id', $1, FALSE)`, [
          tenantId,
        ]),
      );
    }
    if (userId) {
      setConfigs.push(
        this.db.query(`SELECT set_config('app.current_user_id', $1, FALSE)`, [
          userId,
        ]),
      );
    }
    if (branchId) {
      setConfigs.push(
        this.db.query(`SELECT set_config('app.current_branch_id', $1, FALSE)`, [
          branchId,
        ]),
      );
    }
    if (sessionId) {
      setConfigs.push(
        this.db.query(
          `SELECT set_config('app.current_session_id', $1, FALSE)`,
          [sessionId],
        ),
      );
    }
    if (user?.isSuperAdmin) {
      setConfigs.push(
        this.db.query(`SELECT set_config('app.is_superadmin', 'true', FALSE)`),
      );
    }
    setConfigs.push(
      this.db.query(`SELECT set_config('app.client_ip', $1, FALSE)`, [
        ipAddress,
      ]),
    );
    setConfigs.push(
      this.db.query(`SELECT set_config('app.user_agent', $1, FALSE)`, [
        userAgent,
      ]),
    );

    const resetConfigs = () => {
      const resetConfigs = [
        'current_tenant_id',
        'tenant_id',
        'current_user_id',
        'current_branch_id',
        'current_session_id',
        'is_superadmin',
        'client_ip',
        'user_agent',
      ];
      return Promise.all(
        resetConfigs.map((key) =>
          this.db
            .query(`SELECT set_config('app.${key}', '', FALSE)`)
            .catch(() => undefined),
        ),
      );
    };

    return from(
      Promise.all(setConfigs.map((p) => p.catch(() => undefined))),
    ).pipe(
      switchMap(() => next.handle()),
      finalize(() => {
        resetConfigs();
      }),
    );
  }
}
