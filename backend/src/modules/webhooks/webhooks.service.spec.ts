import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<WebhooksService>(WebhooksService);
    // Skip real backoff sleeps in retry tests
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('sign', () => {
    it('produces the correct HMAC-SHA256 of timestamp.payload', () => {
      const expected = crypto
        .createHmac('sha256', 'whsec_1234567890')
        .update('1700000000.{"event":"test.ping"}')
        .digest('hex');
      expect(
        service.sign('1700000000', '{"event":"test.ping"}', 'whsec_1234567890'),
      ).toBe(expected);
    });
  });

  describe('create', () => {
    it('creates an endpoint with normalized events', async () => {
      mockDb.setMockResult('INSERT INTO webhook_endpoints', {
        rows: [
          {
            id: 'e-1',
            tenant_id: 't-1',
            name: 'Payment bot',
            url: 'https://example.com/hook',
            secret: 'whsec_1234567890abcdef',
            events: 'fee.payment.recorded,fee.invoice.generated',
            description: null,
            is_active: true,
            created_at: '2026-01-01',
          },
        ],
      });
      const endpoint = await service.create('t-1', 'u-1', {
        name: 'Payment bot',
        url: 'https://example.com/hook',
        secret: 'whsec_1234567890abcdef',
        events: 'fee.payment.recorded, fee.invoice.generated',
      });
      expect(endpoint.events).toContain('fee.payment.recorded');
    });

    it('rejects non-http(s) URLs', async () => {
      await expect(
        service.create('t-1', 'u-1', {
          name: 'x',
          url: 'ftp://bad',
          secret: 'whsec_1234567890abcdef',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects short secrets', async () => {
      await expect(
        service.create('t-1', 'u-1', {
          name: 'x',
          url: 'https://example.com/hook',
          secret: 'short',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unknown events', async () => {
      await expect(
        service.create('t-1', 'u-1', {
          name: 'x',
          url: 'https://example.com/hook',
          secret: 'whsec_1234567890abcdef',
          events: 'bogus.event',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('emit + delivery', () => {
    it('delivers signed payloads to subscribed endpoints and logs success', async () => {
      const endpoint = {
        id: 'e-1',
        url: 'https://example.com/hook',
        secret: 'whsec_1234567890abcdef',
      };
      mockDb.setMockResult('FROM webhook_endpoints', { rows: [endpoint] });
      mockDb.setMockResult('INSERT INTO webhook_deliveries', {
        rows: [{ id: 'd-1', max_attempts: 3 }],
      });

      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'ok',
      });
      (global as any).fetch = fetchMock;

      const updates: string[] = [];
      const queryMock = (sql: string) => {
        if (sql.includes('INSERT INTO webhook_deliveries')) {
          return { rows: [{ id: 'd-1', max_attempts: 3 }] };
        }
        if (sql.includes('FROM webhook_endpoints')) {
          return { rows: [endpoint] };
        }
        updates.push(sql);
        return { rows: [] };
      };
      mockDb.query = queryMock as any;

      await service.emit('fee.payment.recorded', { amount: 100 }, 't-1');
      await new Promise((resolve) => setImmediate(resolve));

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://example.com/hook');
      expect(init.method).toBe('POST');
      expect(init.headers['X-ERP-Event']).toBe('fee.payment.recorded');
      expect(init.headers['X-ERP-Delivery-Id']).toBe('d-1');

      const signature = init.headers['X-ERP-Signature'] as string;
      const timestamp = init.headers['X-ERP-Timestamp'] as string;
      const body = init.body as string;
      expect(signature).toBe(service.sign(timestamp, body, endpoint.secret));

      const successUpdate = updates.find((u) => u.includes("SET status = $2"));
      expect(successUpdate).toBeTruthy();
      const updateCall = updates.indexOf(successUpdate!);
      expect(updates[updateCall].includes('attempts = $3')).toBe(true);
    });

    it('retries on failure and records the error', async () => {
      const endpoint = {
        id: 'e-1',
        url: 'https://example.com/hook',
        secret: 'whsec_1234567890abcdef',
      };
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' })
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' });
      (global as any).fetch = fetchMock;

      const dbCalls: string[] = [];
      const queryMock = (sql: string) => {
        dbCalls.push(sql);
        if (sql.includes('INSERT INTO webhook_deliveries')) {
          return { rows: [{ id: 'd-2', max_attempts: 3 }] };
        }
        if (sql.includes('FROM webhook_endpoints')) {
          return { rows: [endpoint] };
        }
        return { rows: [] };
      };
      mockDb.query = queryMock as any;

      await service.emit('student.created', { studentId: 's-1' }, 't-1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const successUpdate = dbCalls.findIndex(
        (sql) => sql.includes('SET status = $2') && sql.includes('attempts = $3'),
      );
      expect(successUpdate).toBeGreaterThan(-1);
    });

    it('emits nothing when no endpoints are subscribed', async () => {
      mockDb.setMockResult('FROM webhook_endpoints', { rows: [] });
      const fetchMock = jest.fn();
      (global as any).fetch = fetchMock;

      await service.emit('test.ping', {}, 't-1');
      await new Promise((resolve) => setImmediate(resolve));

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('listDeliveries', () => {
    it('returns rows ordered by created_at desc', async () => {
      const rows = [{ id: 'd-1', event: 'test.ping', status: 'success' }];
      const calls: string[] = [];
      const queryMock = (sql: string) => {
        calls.push(sql);
        return { rows };
      };
      mockDb.query = queryMock as any;

      const deliveries = await service.listDeliveries('t-1', { limit: 10 });
      expect(deliveries).toHaveLength(1);
      expect(calls[0]).toContain('ORDER BY d.created_at DESC');
    });

    it('filters by status', async () => {
      mockDb.setMockResult('JOIN webhook_endpoints e', { rows: [] });
      const calls: string[] = [];
      const queryMock = (sql: string) => {
        calls.push(sql);
        return { rows: [] };
      };
      mockDb.query = queryMock as any;
      await service.listDeliveries('t-1', { status: 'failed' });
      expect(calls[0]).toContain("d.status = $2");
    });
  });

  describe('retryDelivery', () => {
    it('throws NotFound for unknown deliveries', async () => {
      mockDb.setMockResult('JOIN webhook_endpoints e', { rows: [] });
      await expect(
        service.retryDelivery('t-1', 'nope'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects retrying a successful delivery', async () => {
      mockDb.setMockResult('JOIN webhook_endpoints e', {
        rows: [
          {
            id: 'd-1',
            webhook_endpoint_id: 'e-1',
            event: 'test.ping',
            payload: '{}',
            status: 'success',
            max_attempts: 3,
            attempts: 1,
            url: 'https://example.com/hook',
            secret: 'whsec_1234567890abcdef',
            is_active: true,
            deleted_at: null,
          },
        ],
      });
      await expect(
        service.retryDelivery('t-1', 'd-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendTest', () => {
    it('throws NotFound when the endpoint is missing', async () => {
      mockDb.setMockResult('SELECT * FROM webhook_endpoints', { rows: [] });
      await expect(service.sendTest('t-1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
