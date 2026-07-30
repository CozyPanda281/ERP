import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
  action: string;
  module: string;
  resourceType?: string;
  resourceIdParam?: string;
  description?: string;
  includeBody?: boolean;
  includeParams?: boolean;
}

export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);
