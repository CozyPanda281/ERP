export interface TenantContext {
  tenantId: string;
  branchId?: string;
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  isSuperAdmin: boolean;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}
