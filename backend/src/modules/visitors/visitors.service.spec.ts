import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('VisitorsService', () => {
  let service: VisitorsService;
  let mockDb: MockDatabaseProvider;
  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitorsService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<VisitorsService>(VisitorsService);
  });
  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('checkIn', () => {
    it('should check in a visitor', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'v-1' }],
        [{ id: 'v-1', name: 'John', purpose: 'Meeting' }],
      );
      const r = await service.checkIn({
        tenantId: 't-1',
        branchId: 'b-1',
        name: 'John',
        purpose: 'Meeting',
      });
      expect(r.name).toBe('John');
    });
  });
  describe('findById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
    });
  });
  describe('checkOut', () => {
    it('should check out', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'v-1', status: 'checked_in' }],
        [],
        [{ id: 'v-1', status: 'checked_out' }],
      );
      const r = await service.checkOut('v-1');
      expect(r.status).toBe('checked_out');
    });
  });
});
