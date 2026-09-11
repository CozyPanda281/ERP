import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly requests = new Map<string, number>();

  constructor(
    private readonly db: DatabaseProvider,
    private readonly queue: QueueService,
  ) {}

  incrementHttpRequest(method: string, status: number) {
    const key = `${method.toUpperCase()} ${status}`;
    this.requests.set(key, (this.requests.get(key) || 0) + 1);
  }

  // Samples the current event-loop lag: time between this tick and the next.
  private eventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const deltaMs = Number(process.hrtime.bigint() - start) / 1e6;
        resolve(deltaMs);
      });
    });
  }

  private mem = (x: number | undefined) => Math.round((x || 0) / 1024 / 1024);

  async render(): Promise<string> {
    const pool = this.db.getPoolStats();
    const lag = await this.eventLoopLag();
    const { rss, heapTotal, heapUsed, external, arrayBuffers } =
      process.memoryUsage();
    const lines: string[] = [];

    const metric = (
      name: string,
      type: 'gauge' | 'counter',
      value: number | string,
      help = name,
    ) => {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);
      lines.push(`${name} ${value}`);
    };

    metric(
      'erp_api_uptime_seconds',
      'gauge',
      Math.round((Date.now() - this.startedAt) / 1000),
    );
    metric(
      'erp_api_time_seconds',
      'gauge',
      Date.now() / 1000,
      'UNIX timestamp of scrape',
    );
    metric('erp_nodejs_heap_bytes', 'gauge', heapUsed, 'heap used bytes');
    metric('erp_nodejs_heap_total_bytes', 'gauge', heapTotal);
    metric('erp_nodejs_rss_bytes', 'gauge', rss);
    metric('erp_nodejs_external_bytes', 'gauge', external);
    metric('erp_nodejs_arraybuffers_bytes', 'gauge', arrayBuffers);
    metric('erp_event_loop_lag_samples', 'gauge', Number(lag.toFixed(3)), 'ms');
    metric('erp_db_pool_total', 'gauge', pool.total);
    metric('erp_db_pool_idle', 'gauge', pool.idle);
    metric('erp_db_pool_waiting', 'gauge', pool.waiting);
    metric('erp_queue_enabled', 'gauge', this.queue.enabled ? 1 : 0);

    lines.push(
      '# HELP erp_http_requests_total HTTP requests by method and status',
    );
    lines.push('# TYPE erp_http_requests_total counter');
    for (const [key, count] of [...this.requests.entries()].sort()) {
      const [method, status] = key.split(' ');
      lines.push(
        `erp_http_requests_total{method="${method}",status="${status}"} ${count}`,
      );
    }

    void this.mem;
    return `${lines.join('\n')}\n`;
  }
}
