import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseProvider } from '../../database/database.provider';

export const WEBHOOK_EVENTS = [
  'fee.payment.recorded',
  'fee.invoice.generated',
  'student.created',
  'attendance.marked',
  'test.ping',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookEndpointRecord {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  secret: string;
  events: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: string | null;
}

export interface CreateWebhookDto {
  name: string;
  url: string;
  secret: string;
  events?: string;
  description?: string;
}

const DELIVERY_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'erp-webhooks/1.0',
};

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly db: DatabaseProvider) {}

  // ------------------------------------------------------------------
  // Endpoint CRUD
  // ------------------------------------------------------------------

  async create(
    tenantId: string,
    userId: string,
    dto: CreateWebhookDto,
  ): Promise<WebhookEndpointRecord> {
    const name = dto.name?.trim();
    const url = dto.url?.trim();
    const secret = dto.secret?.trim();
    if (!name) throw new BadRequestException('Webhook name is required');
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new BadRequestException('Webhook URL must be a valid http(s) URL');
    }
    if (!secret || secret.length < 16) {
      throw new BadRequestException(
        'Webhook secret must be at least 16 characters',
      );
    }
    const events = this.normalizeEvents(dto.events);

    const result = await this.db.query(
      `INSERT INTO webhook_endpoints
         (tenant_id, name, url, secret, events, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tenantId, name, url, secret, events, dto.description ?? null, userId],
    );
    return this.mapEndpoint(result.rows[0]);
  }

  async list(tenantId: string): Promise<WebhookEndpointRecord[]> {
    const result = await this.db.query(
      `SELECT e.*,
              (SELECT d.sent_at FROM webhook_deliveries d
               WHERE d.webhook_endpoint_id = e.id AND d.sent_at IS NOT NULL
               ORDER BY d.sent_at DESC LIMIT 1) AS last_delivery_at,
              (SELECT d.status FROM webhook_deliveries d
               WHERE d.webhook_endpoint_id = e.id AND d.sent_at IS NOT NULL
               ORDER BY d.sent_at DESC LIMIT 1) AS last_delivery_status
       FROM webhook_endpoints e
       WHERE e.tenant_id = $1 AND e.deleted_at IS NULL
       ORDER BY e.created_at DESC`,
      [tenantId],
    );
    return result.rows.map((r) => this.mapEndpoint(r));
  }

  async update(
    tenantId: string,
    endpointId: string,
    patch: Partial<CreateWebhookDto>,
  ): Promise<WebhookEndpointRecord> {
    const existing = await this.findOwned(tenantId, endpointId);
    if (!existing) throw new NotFoundException('Webhook endpoint not found');

    const url = patch.url?.trim() || existing.url;
    if (!/^https?:\/\//i.test(url)) {
      throw new BadRequestException('Webhook URL must be a valid http(s) URL');
    }
    const secret = patch.secret?.trim() || existing.secret;
    if (secret.length < 16) {
      throw new BadRequestException(
        'Webhook secret must be at least 16 characters',
      );
    }

    const result = await this.db.query(
      `UPDATE webhook_endpoints
       SET name = $3, url = $4, secret = $5, events = $6,
           description = COALESCE($7, description), updated_at = now()
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [
        tenantId,
        endpointId,
        patch.name?.trim() || existing.name,
        url,
        secret,
        this.normalizeEvents(patch.events ?? existing.events),
        patch.description ?? null,
      ],
    );
    return this.mapEndpoint(result.rows[0]);
  }

  async remove(tenantId: string, endpointId: string): Promise<void> {
    const existing = await this.findOwned(tenantId, endpointId);
    if (!existing) throw new NotFoundException('Webhook endpoint not found');
    await this.db.query(
      `UPDATE webhook_endpoints SET deleted_at = now(), is_active = false,
              updated_at = now()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, endpointId],
    );
  }

  // ------------------------------------------------------------------
  // Event emission + delivery
  // ------------------------------------------------------------------

  async emit(
    event: WebhookEvent,
    payload: Record<string, unknown>,
    tenantId: string,
  ): Promise<void> {
    try {
      const result = await this.db.query(
        `SELECT id, url, secret FROM webhook_endpoints
         WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = true
           AND (events = '*' OR events ILIKE $2)`,
        [tenantId, `%${event}%`],
      );

      for (const endpoint of result.rows as {
        id: string;
        url: string;
        secret: string;
      }[]) {
        const body = JSON.stringify({
          event,
          tenantId,
          data: payload,
          sentAt: new Date().toISOString(),
        });

        const delivery = await this.db.query(
          `INSERT INTO webhook_deliveries
             (tenant_id, webhook_endpoint_id, event, payload, status, attempts)
           VALUES ($1, $2, $3, $4, 'pending', 0)
           RETURNING id, max_attempts`,
          [tenantId, endpoint.id, event, body],
        );

        const row = delivery.rows[0] as { id: string; max_attempts: number };
        this.logger.log(
          `Emitting ${event} -> ${endpoint.id} (delivery ${row.id})`,
        );

        void this.deliver({
          tenantId,
          endpointId: endpoint.id,
          deliveryId: row.id,
          url: endpoint.url,
          secret: endpoint.secret,
          event,
          payload: body,
          maxAttempts: row.max_attempts,
        }).catch((err) =>
          this.logger.error(
            `Webhook delivery ${row.id} failed: ${(err as Error).message}`,
          ),
        );
      }
    } catch (err) {
      this.logger.error(`emit(${event}) failed: ${(err as Error).message}`);
    }
  }

  async sendTest(tenantId: string, endpointId: string): Promise<void> {
    const endpoint = await this.findOwned(tenantId, endpointId);
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');
    await this.emit('test.ping', { message: 'Test ping from ERP' }, tenantId);
  }

  // ------------------------------------------------------------------
  // Delivery log
  // ------------------------------------------------------------------

  async listDeliveries(
    tenantId: string,
    opts: { limit?: number; status?: string; endpointId?: string } = {},
  ): Promise<any[]> {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
    const conditions: string[] = ['d.tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (opts.status) {
      params.push(opts.status);
      conditions.push(`d.status = $${params.length}`);
    }
    if (opts.endpointId) {
      params.push(opts.endpointId);
      conditions.push(`d.webhook_endpoint_id = $${params.length}`);
    }
    params.push(limit);

    const result = await this.db.query(
      `SELECT d.id, d.event, d.status, d.attempts, d.max_attempts,
              d.response_status, d.response_body, d.error,
              d.sent_at, d.next_retry_at, d.created_at,
              e.name AS endpoint_name, e.url AS endpoint_url
       FROM webhook_deliveries d
       JOIN webhook_endpoints e ON e.id = d.webhook_endpoint_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.created_at DESC
       LIMIT $${params.length}`,
      params,
    );
    return result.rows;
  }

  async retryDelivery(tenantId: string, deliveryId: string): Promise<void> {
    const result = await this.db.query(
      `SELECT d.id, d.webhook_endpoint_id, d.event, d.payload, d.status,
              d.max_attempts, d.attempts, e.url, e.secret, e.is_active,
              e.deleted_at
       FROM webhook_deliveries d
       JOIN webhook_endpoints e ON e.id = d.webhook_endpoint_id
       WHERE d.id = $1 AND d.tenant_id = $2`,
      [deliveryId, tenantId],
    );
    if (!result.rows.length) throw new NotFoundException('Delivery not found');
    const row = result.rows[0] as any;
    if (row.deleted_at || !row.is_active) {
      throw new BadRequestException('Endpoint is inactive or deleted');
    }
    if (row.status === 'success') {
      throw new BadRequestException('Delivery already succeeded');
    }
    if (row.deleted_at || !row.is_active) {
      throw new BadRequestException('Endpoint is inactive or deleted');
    }

    // Manual retry resets the attempt budget so exhausted deliveries can be
    // re-delivered after the receiver is fixed.
    await this.db.query(
      `UPDATE webhook_deliveries
       SET status = 'pending', attempts = 0, error = NULL, next_retry_at = NULL
       WHERE id = $1`,
      [deliveryId],
    );

    void this.deliver({
      tenantId,
      endpointId: row.webhook_endpoint_id,
      deliveryId,
      url: row.url,
      secret: row.secret,
      event: row.event,
      payload: row.payload,
      maxAttempts: row.max_attempts,
    }).catch((err) =>
      this.logger.error(`Manual retry ${deliveryId} failed: ${(err as Error).message}`),
    );
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private async deliver(params: {
    tenantId: string;
    endpointId: string;
    deliveryId: string;
    url: string;
    secret: string;
    event: string;
    payload: string;
    maxAttempts: number;
  }): Promise<void> {
    const { deliveryId, url, secret, event, payload, maxAttempts } = params;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = this.sign(timestamp, payload, secret);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: {
              ...DELIVERY_HEADERS,
              'X-ERP-Event': event,
              'X-ERP-Timestamp': timestamp,
              'X-ERP-Signature': signature,
              'X-ERP-Delivery-Id': deliveryId,
            },
            body: payload,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        const responseBody = (await response.text()).slice(0, 2000);
        await this.db.query(
          `UPDATE webhook_deliveries
           SET status = $2, attempts = $3, response_status = $4,
               response_body = $5, error = NULL, sent_at = now(), next_retry_at = NULL
           WHERE id = $1`,
          [deliveryId, response.ok ? 'success' : 'failed', attempt, response.status, responseBody],
        );
        if (response.ok) {
          this.logger.log(`Delivery ${deliveryId} succeeded (attempt ${attempt})`);
          return;
        }
        this.logger.warn(
          `Delivery ${deliveryId} attempt ${attempt} -> HTTP ${response.status}`,
        );
      } catch (err) {
        await this.db.query(
          `UPDATE webhook_deliveries
           SET status = 'failed', attempts = $2, error = $3, next_retry_at = NULL
           WHERE id = $1`,
          [
            deliveryId,
            attempt,
            (err as Error).message.slice(0, 500),
          ],
        );
        this.logger.warn(
          `Delivery ${deliveryId} attempt ${attempt} error: ${(err as Error).message}`,
        );
      }

      if (attempt < maxAttempts) {
        const backoffMs = Math.min(2 ** attempt * 1000, 30_000);
        await this.db.query(
          `UPDATE webhook_deliveries
           SET next_retry_at = now() + interval '${backoffMs / 1000} seconds'
           WHERE id = $1`,
          [deliveryId],
        );
        await this.sleep(backoffMs);
      }
    }

    await this.db.query(
      `UPDATE webhook_deliveries SET status = 'failed' WHERE id = $1 AND status <> 'success'`,
      [deliveryId],
    );
  }

  sign(timestamp: string, payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
  }

  private normalizeEvents(events?: string): string {
    const raw = events?.trim();
    if (!raw || raw === '*') return '*';
    const list = raw
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    const unknown = list.filter(
      (e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e),
    );
    if (unknown.length) {
      throw new BadRequestException(`Unknown events: ${unknown.join(', ')}`);
    }
    return list.join(',');
  }

  private async findOwned(
    tenantId: string,
    endpointId: string,
  ): Promise<WebhookEndpointRecord | null> {
    const result = await this.db.query(
      `SELECT * FROM webhook_endpoints
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, endpointId],
    );
    return result.rows.length ? this.mapEndpoint(result.rows[0]) : null;
  }

  private mapEndpoint(row: any): WebhookEndpointRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      url: row.url,
      secret: row.secret,
      events: row.events,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      lastDeliveryAt: row.last_delivery_at ?? null,
      lastDeliveryStatus: row.last_delivery_status ?? null,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
