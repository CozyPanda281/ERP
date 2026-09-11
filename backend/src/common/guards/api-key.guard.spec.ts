import { ApiKeyGuard } from './api-key.guard';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';
import * as crypto from 'crypto';
import { HttpException, UnauthorizedException } from '@nestjs/common';

function buildContext(headers: Record<string, string>) {
  const request: any = {
    headers,
    user: undefined,
    apiKeyContext: undefined,
  };
  const context: any = {
    switchToHttp: () => ({ getRequest: () => request }),
  };
  return { request, context };
}

function keyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    tenant_id: 't-1',
    name: 'Test key',
    key_hash: crypto.createHash('sha256').update('erp_live_abc').digest('hex'),
    scopes: 'read',
    rate_limit_per_minute: 60,
    expires_at: null,
    is_active: true,
    ...overrides,
  };
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockDb: MockDatabaseProvider;

  beforeEach(() => {
    mockDb = new MockDatabaseProvider();
    guard = new ApiKeyGuard(mockDb as any);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('key extraction', () => {
    it('accepts Authorization: Bearer <key>', async () => {
      mockDb.setMockResult('FROM api_keys', { rows: [keyRow()] });
      const { request, context } = buildContext({
        authorization: 'Bearer erp_live_abc',
      });
      const ok = await guard.canActivate(context);
      expect(ok).toBe(true);
      expect(request.user.tenantId).toBe('t-1');
      expect(request.user.apiKey).toBe(true);
      expect(request.apiKeyContext.keyId).toBe('key-1');
    });

    it('accepts X-Api-Key header', async () => {
      mockDb.setMockResult('FROM api_keys', { rows: [keyRow()] });
      const { context } = buildContext({ 'x-api-key': 'erp_live_abc' });
      expect(await guard.canActivate(context)).toBe(true);
    });

    it('rejects missing keys', async () => {
      const { context } = buildContext({});
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('key validation', () => {
    it('rejects unknown secrets', async () => {
      mockDb.setMockResult('FROM api_keys', { rows: [] });
      const { context } = buildContext({ 'x-api-key': 'erp_live_wrong' });
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects revoked keys', async () => {
      mockDb.setMockResult('FROM api_keys', {
        rows: [keyRow({ is_active: false })],
      });
      const { context } = buildContext({ 'x-api-key': 'erp_live_abc' });
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects expired keys', async () => {
      mockDb.setMockResult('FROM api_keys', {
        rows: [keyRow({ expires_at: '2020-01-01T00:00:00Z' })],
      });
      const { context } = buildContext({ 'x-api-key': 'erp_live_abc' });
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('rate limiting', () => {
    it('allows up to the per-minute limit then blocks with 429', async () => {
      mockDb.setMockResult('FROM api_keys', {
        rows: [keyRow({ rate_limit_per_minute: 2 })],
      });
      const { context } = buildContext({ 'x-api-key': 'erp_live_abc' });

      expect(await guard.canActivate(context)).toBe(true);
      expect(await guard.canActivate(context)).toBe(true);
      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: 429,
      });
    });

    it('resets the window after 60 seconds', async () => {
      jest.useFakeTimers();
      mockDb.setMockResult('FROM api_keys', {
        rows: [keyRow({ rate_limit_per_minute: 1 })],
      });
      const { context } = buildContext({ 'x-api-key': 'erp_live_abc' });

      expect(await guard.canActivate(context)).toBe(true);
      jest.advanceTimersByTime(60_001);
      expect(await guard.canActivate(context)).toBe(true);
      jest.useRealTimers();
    });
  });
});
