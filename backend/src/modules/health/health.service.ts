import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseProvider } from '../../database/database.provider';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startedAt = Date.now();

  constructor(
    private readonly db: DatabaseProvider,
    private readonly queue: QueueService,
    private readonly configService: ConfigService,
  ) {}

  liveness() {
    return {
      status: 'ok',
      service: 'erp-api',
      version: '1.0.0',
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  async dbHealth() {
    const started = Date.now();
    let dbOk = false;
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('db ping timeout')), 2000),
      );
      const ping = this.db.query('SELECT 1');
      await Promise.race([ping, timeout]);
      dbOk = true;
    } catch (err) {
      this.logger.error(
        `Health check db ping failed: ${(err as Error).message}`,
      );
    }

    const redisHost = this.configService.get<string>('redis.host');
    const payload = {
      status: dbOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: {
        status: dbOk ? 'ok' : 'error',
        latencyMs: Date.now() - started,
      },
      redis: {
        configured: !!redisHost,
        enabled: this.queue.enabled,
      },
    };

    if (!dbOk) {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }
}
