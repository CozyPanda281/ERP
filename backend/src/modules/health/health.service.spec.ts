import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import { DatabaseProvider } from '../../database/database.provider';
import { QueueService } from '../queue/queue.service';
import { ConfigService } from '@nestjs/config';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('HealthService', () => {
  let service: HealthService;
  let mockDb: MockDatabaseProvider;

  const mockQueue = { enabled: false } as QueueService;
  const mockConfig = {
    get: (key: string) => (key === 'redis.host' ? 'localhost' : undefined),
  } as unknown as ConfigService;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DatabaseProvider, useValue: mockDb },
        { provide: QueueService, useValue: mockQueue },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('liveness', () => {
    it('reports ok with uptime and timestamp', () => {
      const result = service.liveness();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('erp-api');
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('dbHealth', () => {
    it('returns ok when the database answers SELECT 1', async () => {
      const result = await service.dbHealth();
      expect(result.status).toBe('ok');
      expect(result.database.status).toBe('ok');
      expect(result.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.redis.configured).toBe(true);
      expect(result.redis.enabled).toBe(false);
    });

    it('throws 503 when the database is unreachable', async () => {
      mockDb.query = jest.fn().mockRejectedValue(new Error('connection refused'));
      await expect(service.dbHealth()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
