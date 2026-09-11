import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { DatabaseProvider } from '../../database/database.provider';
import { QueueService } from '../queue/queue.service';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockDb: MockDatabaseProvider;

  const mockQueue = { enabled: true } as QueueService;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: DatabaseProvider, useValue: mockDb },
        { provide: QueueService, useValue: mockQueue },
      ],
    }).compile();
    service = module.get<MetricsService>(MetricsService);
    jest.spyOn(service as any, 'eventLoopLag').mockResolvedValue(1.5);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  it('increments and renders Prometheus text with counters, gauges no labels by default', async () => {
    service.incrementHttpRequest('GET', 200);
    service.incrementHttpRequest('GET', 200);
    service.incrementHttpRequest('POST', 401);

    const output = await service.render();
    const lines = output.trim().split('\n');

    expect(lines[0]).toBe(
      '# HELP erp_api_uptime_seconds erp_api_uptime_seconds',
    );
    expect(output).toContain(
      'erp_http_requests_total{method="GET",status="200"} 2',
    );
    expect(output).toContain(
      'erp_http_requests_total{method="POST",status="401"} 1',
    );
    expect(output).toContain('erp_queue_enabled 1');
    expect(output).toContain('erp_event_loop_lag_samples 1.5');
    expect(output).toMatch(/erp_db_pool_total \d+/);
    expect(output).toMatch(/erp_nodejs_heap_bytes \d+/);
  });

  it('renders zero request metrics for fresh state', async () => {
    const output = await service.render();
    expect(output).not.toMatch(/erp_http_requests_total\{/);
  });
});
