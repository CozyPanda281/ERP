import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseProvider } from '../../database/database.provider';

export interface CreateApiKeyDto {
  name: string;
  scopes?: string;
  rateLimitPerMinute?: number;
  expiresAt?: string | null;
}

export interface ApiKeyRecord {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  rateLimitPerMinute: number;
  createdBy: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export function hashApiKey(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export function generateApiKey(): { secret: string; prefix: string } {
  const raw = crypto.randomBytes(24).toString('base64url');
  return { secret: `erp_live_${raw}`, prefix: 'erp_live_' };
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly db: DatabaseProvider) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<{ key: ApiKeyRecord; secret: string }> {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Key name is required');

    const duplicate = await this.db.query(
      `SELECT id FROM api_keys
       WHERE tenant_id = $1 AND name = $2 AND deleted_at IS NULL`,
      [tenantId, name],
    );
    if (duplicate.rows.length) {
      throw new ConflictException('An API key with this name already exists');
    }

    const { secret, prefix } = generateApiKey();
    const scopes = dto.scopes?.trim() || 'read';
    if (!scopes.split(',').every((s) => ['read', 'write'].includes(s.trim()))) {
      throw new BadRequestException(
        'Scopes must be a comma-separated list of: read, write',
      );
    }
    const rateLimit = Math.max(1, Math.min(600, dto.rateLimitPerMinute ?? 60));
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const result = await this.db.query(
      `INSERT INTO api_keys
         (tenant_id, name, key_prefix, key_hash, scopes, rate_limit_per_minute,
          created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id, name, key_prefix, scopes, rate_limit_per_minute,
                 created_by, last_used_at, expires_at, is_active, created_at`,
      [
        tenantId,
        name,
        prefix,
        hashApiKey(secret),
        scopes,
        rateLimit,
        userId,
        expiresAt,
      ],
    );

    return { key: this.mapRow(result.rows[0]), secret };
  }

  async list(tenantId: string): Promise<ApiKeyRecord[]> {
    const result = await this.db.query(
      `SELECT id, tenant_id, name, key_prefix, scopes, rate_limit_per_minute,
              created_by, last_used_at, expires_at, is_active, created_at
       FROM api_keys
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [tenantId],
    );
    return result.rows.map((r) => this.mapRow(r));
  }

  async update(
    tenantId: string,
    keyId: string,
    patch: Partial<
      Pick<
        CreateApiKeyDto,
        'name' | 'scopes' | 'rateLimitPerMinute' | 'expiresAt'
      >
    >,
  ): Promise<ApiKeyRecord> {
    const existing = await this.findOwned(tenantId, keyId);
    if (!existing) throw new NotFoundException('API key not found');

    const name = patch.name?.trim() || existing.name;
    const scopes = patch.scopes?.trim() || existing.scopes;
    if (!scopes.split(',').every((s) => ['read', 'write'].includes(s.trim()))) {
      throw new BadRequestException(
        'Scopes must be a comma-separated list of: read, write',
      );
    }
    const rateLimit = Math.max(
      1,
      Math.min(600, patch.rateLimitPerMinute ?? existing.rateLimitPerMinute),
    );
    const expiresAt =
      patch.expiresAt === null || patch.expiresAt === undefined
        ? existing.expiresAt
        : patch.expiresAt
          ? new Date(patch.expiresAt)
          : null;

    const result = await this.db.query(
      `UPDATE api_keys
       SET name = $3, scopes = $4, rate_limit_per_minute = $5, expires_at = $6,
           updated_at = now()
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING id, tenant_id, name, key_prefix, scopes, rate_limit_per_minute,
                 created_by, last_used_at, expires_at, is_active, created_at`,
      [tenantId, keyId, name, scopes, rateLimit, expiresAt],
    );
    return this.mapRow(result.rows[0]);
  }

  async revoke(tenantId: string, keyId: string): Promise<void> {
    const existing = await this.findOwned(tenantId, keyId);
    if (!existing) throw new NotFoundException('API key not found');
    await this.db.query(
      `UPDATE api_keys SET is_active = false, updated_at = now()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, keyId],
    );
  }

  async delete(tenantId: string, keyId: string): Promise<void> {
    const existing = await this.findOwned(tenantId, keyId);
    if (!existing) throw new NotFoundException('API key not found');
    await this.db.query(
      `UPDATE api_keys SET deleted_at = now(), is_active = false, updated_at = now()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, keyId],
    );
  }

  private async findOwned(
    tenantId: string,
    keyId: string,
  ): Promise<ApiKeyRecord | null> {
    const result = await this.db.query(
      `SELECT id, tenant_id, name, key_prefix, scopes, rate_limit_per_minute,
              created_by, last_used_at, expires_at, is_active, created_at
       FROM api_keys
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, keyId],
    );
    return result.rows.length ? this.mapRow(result.rows[0]) : null;
  }

  private mapRow(row: any): ApiKeyRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      keyPrefix: row.key_prefix,
      scopes: row.scopes,
      rateLimitPerMinute: row.rate_limit_per_minute,
      createdBy: row.created_by,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}
