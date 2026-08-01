import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockDb: MockDatabaseProvider;
  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });
  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('should create template', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'tpl-1' }],
        [{ id: 'tpl-1', name: 'Welcome', code: 'WELCOME' }],
      );
      const r = await service.createTemplate({
        tenantId: 't-1',
        name: 'Welcome',
        code: 'WELCOME',
        type: 'email',
        body: 'Hello',
      });
      expect(r.name).toBe('Welcome');
    });
  });
  describe('sendNotification', () => {
    it('should send notification', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'notif-1' }],
        [{ id: 'notif-1', title: 'Test', message: 'Hello' }],
      );
      const r = await service.sendNotification({
        tenantId: 't-1',
        title: 'Test',
        message: 'Hello',
      });
      expect(r.title).toBe('Test');
    });
  });
  describe('createAnnouncement', () => {
    it('should create announcement', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'ann-1' }],
        [{ id: 'ann-1', title: 'Holiday' }],
      );
      const r = await service.createAnnouncement({
        tenantId: 't-1',
        branchId: 'b-1',
        title: 'Holiday',
        content: 'No class',
        createdBy: 'u-1',
      });
      expect(r.title).toBe('Holiday');
    });
  });
});
