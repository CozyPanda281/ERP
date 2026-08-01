import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import * as net from 'net';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queue: Queue<EmailJobData> | null = null;
  private worker: Worker<EmailJobData> | null = null;
  private emailHandler: ((data: EmailJobData) => Promise<void>) | null = null;

  enabled = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host');
    const port = parseInt(this.configService.get<string>('redis.port', '6379'), 10);
    const password = this.configService.get<string>('redis.password', '') || undefined;

    if (!host || !(await this.canReach(host, port))) {
      this.logger.warn(
        `Redis not reachable at ${host}:${port} — job queue disabled, emails send inline`,
      );
      return;
    }

    const connection = { host, port, password, maxRetriesPerRequest: null };

    try {
      this.queue = new Queue<EmailJobData>('email-jobs', {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      });

      this.worker = new Worker<EmailJobData>(
        'email-jobs',
        async (job: Job<EmailJobData>) => {
          if (this.emailHandler) {
            await this.emailHandler(job.data);
          } else {
            this.logger.warn(
              `No email handler registered — dropped job ${job.id} (${job.data.to})`,
            );
          }
        },
        { connection, concurrency: 5 },
      );

      this.worker.on('failed', (job, err) => {
        this.logger.error(
          `Email job ${job?.id} failed after retries: ${err.message}`,
        );
      });

      this.enabled = true;
      this.logger.log(
        `Job queue enabled at ${host}:${port} (queue: email-jobs)`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to initialize job queue: ${(err as Error).message} — emails send inline`,
      );
      await this.close();
    }
  }

  setEmailHandler(handler: (data: EmailJobData) => Promise<void>) {
    this.emailHandler = handler;
  }

  async enqueueEmail(data: EmailJobData): Promise<boolean> {
    if (!this.enabled || !this.queue) return false;
    try {
      await this.queue.add('send', data);
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to enqueue email to ${data.to}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async close() {
    try {
      if (this.worker) await this.worker.close();
    } catch {
      /* ignore */
    }
    try {
      if (this.queue) await this.queue.close();
    } catch {
      /* ignore */
    }
    this.worker = null;
    this.queue = null;
    this.enabled = false;
  }

  private canReach(host: string, port: number, timeoutMs = 500): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        socket.destroy();
        resolve(ok);
      };
      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
      socket.connect(port, host);
    });
  }
}
