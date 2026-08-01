import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditService } from '../../modules/audit/audit.service';
import {
  AUDIT_LOG_KEY,
  AuditLogOptions,
} from '../decorators/audit-log.decorator';
import { TENANT_CONTEXT_KEY } from '../constants';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditOptions = this.reflector.getAllAndOverride<AuditLogOptions>(
      AUDIT_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditOptions) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const tenantContext = (request as any)[TENANT_CONTEXT_KEY];
    const user = request.user as any;

    // Resolve resource ID from params if specified
    let resourceId: string | undefined;
    if (auditOptions.resourceIdParam) {
      const param = request.params[auditOptions.resourceIdParam];
      resourceId = Array.isArray(param) ? param[0] : param;
    }

    // Build description from template or method info
    const description =
      auditOptions.description ||
      `${auditOptions.action} ${auditOptions.resourceType || 'resource'}`;

    return next.handle().pipe(
      tap({
        next: () => {
          this.auditService
            .log({
              tenantId: tenantContext?.tenantId || user?.tenantId,
              userId: user?.sub,
              branchId: user?.branchId,
              action: auditOptions.action,
              module: auditOptions.module,
              resourceType: auditOptions.resourceType,
              resourceId,
              description,
              changes: auditOptions.includeBody
                ? (request.body as Record<string, unknown>)
                : undefined,
              ipAddress: request.ip || request.socket?.remoteAddress,
              userAgent: request.headers['user-agent'],
              sessionId: user?.sessionId,
              outcome: 'success',
            })
            .catch((err) =>
              this.logger.error(`Audit log failed: ${err.message}`),
            );
        },
        error: (error) => {
          this.auditService
            .log({
              tenantId: tenantContext?.tenantId || user?.tenantId,
              userId: user?.sub,
              branchId: user?.branchId,
              action: auditOptions.action,
              module: auditOptions.module,
              resourceType: auditOptions.resourceType,
              resourceId,
              description: `${description} — FAILED: ${error.message}`,
              ipAddress: request.ip || request.socket?.remoteAddress,
              userAgent: request.headers['user-agent'],
              sessionId: user?.sessionId,
              outcome: 'failure',
            })
            .catch((err) =>
              this.logger.error(`Audit log failed: ${err.message}`),
            );
        },
      }),
    );
  }
}
