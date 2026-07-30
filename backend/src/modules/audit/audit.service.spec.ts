import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('AuditService', () => {
  let service: AuditService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should buffer audit entries', async () => {
      const flushSpy = jest.spyOn(service as any, 'flush');

      await service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'user.login',
        module: 'auth',
        outcome: 'success',
      });

      expect((service as any).buffer.length).toBe(1);
      expect(flushSpy).not.toHaveBeenCalled();
    });

    it('should flush when buffer reaches threshold', async () => {
      const flushSpy = jest.spyOn(service as any, 'flush');

      for (let i = 0; i < 50; i++) {
        await service.log({
          action: `action.${i}`,
          module: 'test',
        });
      }

      expect(flushSpy).toHaveBeenCalled();
      expect((service as any).buffer.length).toBe(0);
    });
  });

  describe('find', () => {
    it('should return paginated audit logs', async () => {
      mockDb.setDrizzleResults(
        [{ count: 10 }],
        [{ id: 'log-1', action: 'user.login', module: 'auth', userName: 'Admin User', createdAt: new Date() }],
      );

      const result = await service.find({ tenantId: 'tenant-1', page: 1, limit: 20 });
      expect(result.data).toBeDefined();
      expect(result.pagination.total).toBe(10);
    });

    it('should filter by action and module', async () => {
      mockDb.setDrizzleResults(
        [{ count: 5 }],
        [{ id: 'log-2', action: 'student.create', module: 'admissions', userName: null }],
      );

      const result = await service.find({
        action: 'student.create',
        module: 'admissions',
      });

      expect(result.data.length).toBe(1);
    });
  });

  describe('logAction', () => {
    it('should log with context from request', async () => {
      await service.logAction(
        'student.create',
        'admissions',
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          ipAddress: '192.168.1.1',
        },
        { type: 'student', id: 'student-1' },
      );

      expect((service as any).buffer.length).toBe(1);
    });
  });
});
