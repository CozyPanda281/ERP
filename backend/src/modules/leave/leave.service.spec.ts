import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('LeaveService', () => {
  let service: LeaveService;
  let mockDb: MockDatabaseProvider;
  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<LeaveService>(LeaveService);
  });
  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('createLeaveType', () => {
    it('should create leave type', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'lt-1' }],
        [{ id: 'lt-1', name: 'Sick', code: 'SL' }],
      );
      const r = await service.createLeaveType({
        tenantId: 't-1',
        name: 'Sick',
        code: 'SL',
        daysAllowed: 12,
      });
      expect(r.name).toBe('Sick');
    });
  });
  describe('findRequestById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findRequestById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
  describe('approveRequest', () => {
    it('should approve', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'lr-1', status: 'pending' }],
        [],
        [{ id: 'lr-1', status: 'approved' }],
      );
      const r = await service.approveRequest('lr-1', 'u-1');
      expect(r.status).toBe('approved');
    });
  });
});
