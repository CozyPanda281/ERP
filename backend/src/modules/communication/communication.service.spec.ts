import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';
import { EmailService } from '../../shared/email/email.service';

const mockEmailService = { send: jest.fn().mockResolvedValue(true) };

describe('CommunicationService', () => {
  let service: CommunicationService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationService,
        { provide: DatabaseProvider, useValue: mockDb },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();
    service = module.get<CommunicationService>(CommunicationService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  const T = { tenantId: 't-1', branchId: 'b-1' };

  // ─── Templates ───────────────────────────────────────────────────────────

  describe('createTemplate', () => {
    it('should create a template', async () => {
      mockDb.setDrizzleResults(
        [],
        [
          {
            id: 'tmpl-1',
            name: 'Welcome',
            code: 'WELCOME',
            type: 'email',
            subject: 'Hi',
            body: 'Hello {{name}}',
          },
        ],
        [
          {
            id: 'tmpl-1',
            name: 'Welcome',
            code: 'WELCOME',
            type: 'email',
            subject: 'Hi',
            body: 'Hello {{name}}',
          },
        ],
      );
      const result = await service.createTemplate({
        tenantId: T.tenantId,
        name: 'Welcome',
        code: 'WELCOME',
        type: 'email',
        subject: 'Hi',
        body: 'Hello {{name}}',
      });
      expect(result.name).toBe('Welcome');
      expect(result.code).toBe('WELCOME');
    });

    it('should reject duplicate code', async () => {
      mockDb.setDrizzleResults([{ id: 'existing' }]);
      await expect(
        service.createTemplate({
          tenantId: T.tenantId,
          name: 'Welcome',
          code: 'WELCOME',
          type: 'email',
          body: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTemplatesByTenant', () => {
    it('should list templates', async () => {
      mockDb.setDrizzleResults([
        { id: 'tmpl-1', name: 'Welcome', code: 'WELCOME' },
        { id: 'tmpl-2', name: 'Reminder', code: 'REMINDER' },
      ]);
      const result = await service.findTemplatesByTenant(T.tenantId);
      expect(result).toHaveLength(2);
    });
  });

  describe('updateTemplate', () => {
    it('should update a template', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'tmpl-1' }],
        [],
        [{ id: 'tmpl-1', name: 'Updated', code: 'WELCOME' }],
      );
      const result = await service.updateTemplate('tmpl-1', T.tenantId, {
        name: 'Updated',
      });
      expect(result.name).toBe('Updated');
    });

    it('should throw on missing template', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.updateTemplate('bad', T.tenantId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      mockDb.setDrizzleResults([{ id: 'tmpl-1' }]);
      await expect(
        service.deleteTemplate('tmpl-1', T.tenantId),
      ).resolves.not.toThrow();
    });

    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.deleteTemplate('bad', T.tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── Notifications ───────────────────────────────────────────────────────

  describe('createNotification', () => {
    it('should create notification without target users', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'notif-1' }],
        [
          {
            id: 'notif-1',
            title: 'System Update',
            message: 'Scheduled maintenance',
          },
        ],
      );
      const result = await service.createNotification({
        tenantId: T.tenantId,
        senderId: 'u-1',
        title: 'System Update',
        message: 'Scheduled maintenance',
      });
      expect(result.title).toBe('System Update');
    });

    it('should create notification with target users', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'notif-2' }],
        [],
        [{ id: 'notif-2', title: 'Hello', message: 'Test', type: 'in_app' }],
      );
      const result = await service.createNotification({
        tenantId: T.tenantId,
        branchId: T.branchId,
        senderId: 'u-1',
        title: 'Hello',
        message: 'Test',
        targetUsers: ['u-1', 'u-2'],
        type: 'in_app',
      });
      expect(result.title).toBe('Hello');
    });
  });

  describe('findMyNotifications', () => {
    it('should return paginated notifications', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'notif-1',
            title: 'Alert',
            message: 'Test',
            type: 'in_app',
            priority: 'high',
            createdAt: new Date(),
            readAt: null,
            status: 'sent',
          },
        ],
        [{ count: '1' }],
        [{ count: '0' }],
      );
      const result = await service.findMyNotifications('u-1', T.branchId, {});
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockDb.setDrizzleResults([{ id: 'log-1' }]);
      const result = await service.markAsRead('notif-1', 'u-1');
      expect(result.success).toBe(true);
    });

    it('should throw if log not found', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.markAsRead('notif-1', 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      mockDb.setDrizzleResults([]);
      const result = await service.markAllAsRead('u-1', T.branchId);
      expect(result.success).toBe(true);
    });
  });

  // ─── Announcements ───────────────────────────────────────────────────────

  describe('createAnnouncement', () => {
    it('should create an announcement', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'ann-1' }],
        [
          {
            id: 'ann-1',
            title: 'Holiday',
            content: 'School closed',
            isPinned: false,
          },
        ],
      );
      const result = await service.createAnnouncement({
        tenantId: T.tenantId,
        branchId: T.branchId,
        createdBy: 'u-1',
        title: 'Holiday',
        content: 'School closed',
      });
      expect(result.title).toBe('Holiday');
    });
  });

  describe('findAnnouncementsByBranch', () => {
    it('should return paginated announcements', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'ann-1',
            title: 'Notice',
            content: 'Test',
            priority: 'high',
            isPinned: false,
            publishedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        [{ count: '1' }],
      );
      const result = await service.findAnnouncementsByBranch(T.branchId, {});
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('updateAnnouncement', () => {
    it('should update an announcement', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'ann-1' }],
        [],
        [{ id: 'ann-1', title: 'Updated', content: 'Updated content' }],
      );
      const result = await service.updateAnnouncement('ann-1', T.branchId, {
        title: 'Updated',
      });
      expect(result.title).toBe('Updated');
    });

    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.updateAnnouncement('bad', T.branchId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAnnouncement', () => {
    it('should delete an announcement', async () => {
      mockDb.setDrizzleResults([{ id: 'ann-1' }]);
      await expect(
        service.deleteAnnouncement('ann-1', T.branchId),
      ).resolves.not.toThrow();
    });

    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.deleteAnnouncement('bad', T.branchId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
