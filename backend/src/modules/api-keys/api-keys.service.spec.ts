import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ApiKeysService, generateApiKey, hashApiKey } from './api-keys.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<ApiKeysService>(ApiKeysService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('generateApiKey', () => {
    it('produces an erp_live_ prefixed secret and matching prefix', () => {
      const { secret, prefix } = generateApiKey();
      expect(secret.startsWith('erp_live_')).toBe(true);
      expect(prefix).toBe('erp_live_');
      expect(secret.length).toBeGreaterThan(20);
    });

    it('produces unique secrets', () => {
      expect(generateApiKey().secret).not.toBe(generateApiKey().secret);
    });
  });

  describe('hashApiKey', () => {
    it('is deterministic and never equals the secret', () => {
      const secret = 'erp_live_abc123';
      const h1 = hashApiKey(secret);
      const h2 = hashApiKey(secret);
      expect(h1).toBe(h2);
      expect(h1).not.toBe(secret);
      expect(h1).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('create', () => {
    it('returns the plaintext secret once and stores only the hash', async () => {
      mockDb.setMockResult('WHERE tenant_id = $1 AND name = $2', {
        rows: [],
      });
      const inserted = {
        id: 'key-1',
        tenant_id: 't-1',
        name: 'Integrations',
        key_prefix: 'erp_live_',
        scopes: 'read',
        rate_limit_per_minute: 60,
        created_by: 'u-1',
        last_used_at: null,
        expires_at: null,
        is_active: true,
        created_at: '2026-01-01',
      };
      const insertCalls: any[][] = [];
      const queryMock = (sql: string, params?: unknown[]) => {
        if (sql.includes('INSERT INTO api_keys')) {
          insertCalls.push(params as any[]);
          return { rows: [inserted] };
        }
        return { rows: [] };
      };
      mockDb.query = queryMock as any;

      const { key, secret } = await service.create('t-1', 'u-1', {
        name: 'Integrations',
      });

      expect(secret.startsWith('erp_live_')).toBe(true);
      expect(key.id).toBe('key-1');
      const params = insertCalls[0];
      expect(params[2]).toBe('erp_live_');
      expect(params[3]).toBe(hashApiKey(secret));
      expect(params[3]).not.toBe(secret);
    });

    it('rejects duplicate names', async () => {
      mockDb.setMockResult('WHERE tenant_id = $1 AND name = $2', {
        rows: [{ id: 'key-1' }],
      });
      await expect(
        service.create('t-1', 'u-1', { name: 'dup' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects invalid scopes', async () => {
      await expect(
        service.create('t-1', 'u-1', { name: 'x', scopes: 'admin' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires a name', async () => {
      await expect(
        service.create('t-1', 'u-1', { name: '  ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns rows for the tenant only', async () => {
      const rows = [
        {
          id: 'key-1',
          tenant_id: 't-1',
          name: 'A',
          key_prefix: 'erp_live_',
          scopes: 'read',
          rate_limit_per_minute: 60,
          created_by: null,
          last_used_at: null,
          expires_at: null,
          is_active: true,
          created_at: '2026-01-01',
        },
      ];
      const calls: string[] = [];
      const queryMock = (sql: string) => {
        calls.push(sql);
        return { rows };
      };
      mockDb.query = queryMock as any;

      const keys = await service.list('t-1');
      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe('A');
      expect(calls[0]).toContain('WHERE tenant_id = $1');
    });
  });

  describe('revoke / delete', () => {
    it('throws NotFound for keys outside the tenant', async () => {
      mockDb.setMockResult(
        'SELECT id, tenant_id, name, key_prefix, scopes, rate_limit_per_minute',
        { rows: [] },
      );
      await expect(service.revoke('t-1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete('t-1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('revokes and soft-deletes owned keys', async () => {
      const row = {
        id: 'key-1',
        tenant_id: 't-1',
        name: 'A',
        key_prefix: 'erp_live_',
        scopes: 'read',
        rate_limit_per_minute: 60,
        created_by: null,
        last_used_at: null,
        expires_at: null,
        is_active: true,
        created_at: '2026-01-01',
      };
      mockDb.setMockResult('SELECT id, tenant_id, name, key_prefix', { rows: [row] });
      const updates: string[] = [];
      const queryMock = (sql: string) => {
        if (sql.includes('SELECT id, tenant_id, name, key_prefix')) {
          return { rows: [row] };
        }
        updates.push(sql);
        return { rows: [], rowCount: 1 };
      };
      mockDb.query = queryMock as any;

      await service.revoke('t-1', 'key-1');
      await service.delete('t-1', 'key-1');
      expect(updates[0]).toContain('is_active = false');
      expect(updates[1]).toContain('deleted_at = now()');
    });
  });
});
