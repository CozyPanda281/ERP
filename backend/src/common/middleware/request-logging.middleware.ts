import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TENANT_CONTEXT_KEY } from '../constants';
import { MetricsService } from '../../modules/metrics/metrics.service';

// Structured access log: one JSON line per request with request id, tenant id,
// user id, status and latency. Hooks the response 'finish' event so it covers
// every request (matched routes, 404s, guard rejections). Never logs bodies,
// headers or PII.
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('http');

  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const started = Date.now();

    res.on('finish', () => {
      const tenantContext = (req as any)[TENANT_CONTEXT_KEY];
      const user = req.user as any;

      this.metricsService.incrementHttpRequest(req.method, res.statusCode);

      this.logger.log({
        type: 'http.request',
        requestId: (req as any).requestId || null,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        latencyMs: Date.now() - started,
        tenantId: tenantContext?.tenantId || user?.tenantId || null,
        userId: user?.sub || user?.id || null,
        ip: req.ip,
      });
    });

    next();
  }
}
