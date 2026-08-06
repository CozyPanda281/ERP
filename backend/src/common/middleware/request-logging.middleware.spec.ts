import { Request, Response } from 'express';
import { EventEmitter } from 'events';
import { Logger } from '@nestjs/common';
import { RequestLoggingMiddleware } from './request-logging.middleware';
import { TENANT_CONTEXT_KEY } from '../constants';

describe('RequestLoggingMiddleware', () => {
  let middleware: RequestLoggingMiddleware;
  let logSpy: jest.SpyInstance;
  const metricsService = { incrementHttpRequest: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    middleware = new RequestLoggingMiddleware(metricsService as any);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  const makeReq = (overrides: Record<string, unknown> = {}) => {
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/health',
      url: '/api/v1/health',
      ip: '127.0.0.1',
      requestId: 'req-123',
      user: { sub: 'user-1', tenantId: 'tenant-1' },
      [TENANT_CONTEXT_KEY]: { tenantId: 'tenant-1' },
      ...overrides,
    };
    return request as Request;
  };

  const makeRes = () => {
    const res = new EventEmitter() as unknown as Response & EventEmitter;
    (res as any).statusCode = 200;
    return res;
  };

  const finish = (res: Response & EventEmitter, status: number) => {
    (res as any).statusCode = status;
    res.emit('finish');
  };

  it('logs one structured line on response finish and increments metrics', () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
    finish(res, 200);

    expect(metricsService.incrementHttpRequest).toHaveBeenCalledWith(
      'GET',
      200,
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
    const entry = logSpy.mock.calls[0][0];
    expect(entry).toMatchObject({
      type: 'http.request',
      requestId: 'req-123',
      method: 'GET',
      path: '/api/v1/health',
      status: 200,
      tenantId: 'tenant-1',
      userId: 'user-1',
      ip: '127.0.0.1',
    });
    expect(entry.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('logs 404s and guard rejections with the final status', () => {
    const req = makeReq({ originalUrl: '/api/v1/nope' });
    const res = makeRes();
    middleware.use(req, res, jest.fn());
    finish(res, 404);
    expect(logSpy.mock.calls[0][0].status).toBe(404);
  });

  it('logs anonymous requests with null ids', () => {
    const req = makeReq({ user: undefined, [TENANT_CONTEXT_KEY]: undefined });
    const res = makeRes();
    middleware.use(req, res, jest.fn());
    finish(res, 401);
    const entry = logSpy.mock.calls[0][0];
    expect(entry.tenantId).toBeNull();
    expect(entry.userId).toBeNull();
    expect(entry.status).toBe(401);
  });
});
