import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';
import { DatabaseProvider } from '../../database/database.provider';

export interface ApiKeyContext {
  keyId: string;
  tenantId: string;
  name: string;
  scopes: string[];
  rateLimitPerMinute: number;
  expiresAt: string | null;
}

interface KeyRow {
  id: string;
  tenant_id: string;
  name: string;
  key_hash: string;
  scopes: string;
  rate_limit_per_minute: number;
  expires_at: string | null;
  is_active: boolean;
}

interface RateWindow {
  startedAt: number;
  count: number;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly windows = new Map<string, RateWindow>();

  constructor(private readonly db: DatabaseProvider) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = this.extractKey(request);
    if (!secret) {
      throw new UnauthorizedException('API key required');
    }

    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    const result = await this.db.query(
      `SELECT id, tenant_id, name, key_hash, scopes, rate_limit_per_minute,
              expires_at, is_active
       FROM api_keys
       WHERE key_hash = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [hash],
    );

    if (!result.rows.length) {
      throw new UnauthorizedException('Invalid API key');
    }

    const key = result.rows[0] as KeyRow;

    if (!key.is_active) {
      throw new UnauthorizedException('API key is revoked');
    }
    if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
      throw new UnauthorizedException('API key has expired');
    }

    if (!this.checkRateLimit(key.id, key.rate_limit_per_minute)) {
      throw new HttpException(
        'API key rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    request.user = {
      tenantId: key.tenant_id,
      keyId: key.id,
      apiKey: true,
      roles: ['API_KEY'],
      isSuperAdmin: false,
      scopes: key.scopes.split(',').map((s) => s.trim()).filter(Boolean),
      rateLimitPerMinute: key.rate_limit_per_minute,
    } as any;
    (request as any).apiKeyContext = {
      keyId: key.id,
      tenantId: key.tenant_id,
      name: key.name,
      scopes: key.scopes.split(',').map((s) => s.trim()).filter(Boolean),
      rateLimitPerMinute: key.rate_limit_per_minute,
      expiresAt: key.expires_at,
    } as ApiKeyContext;

    this.db
      .query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [key.id])
      .catch((err) =>
        this.logger.warn(`Failed to touch api_key last_used_at: ${err.message}`),
      );

    return true;
  }

  private extractKey(request: Request): string | null {
    const auth = request.headers['authorization'] as string | undefined;
    if (auth?.toLowerCase().startsWith('bearer ')) {
      return auth.slice(7).trim();
    }
    const header = request.headers['x-api-key'] as string | undefined;
    if (header?.trim()) return header.trim();
    return null;
  }

  private checkRateLimit(keyId: string, perMinute: number): boolean {
    const now = Date.now();
    const window = this.windows.get(keyId);
    if (!window || now - window.startedAt >= 60_000) {
      this.windows.set(keyId, { startedAt: now, count: 1 });
      return true;
    }
    if (window.count >= perMinute) return false;
    window.count += 1;
    return true;
  }
}
