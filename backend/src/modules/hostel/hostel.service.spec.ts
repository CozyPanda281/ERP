import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HostelService } from './hostel.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('HostelService', () => {
  let service: HostelService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [HostelService, { provide: DatabaseProvider, useValue: mockDb }],
    }).compile();
    service = module.get<HostelService>(HostelService);
  });

  afterEach(() => { mockDb.clearMocks(); jest.clearAllMocks(); });

  const T = { tenantId: 't-1', branchId: 'b-1' };

  describe('createHostel', () => {
    it('should create a hostel', async () => {
      mockDb.setDrizzleResults([{ id: 'h-1' }], [{ id: 'h-1', name: 'Boys Hostel', deletedAt: null }]);
      const result = await service.createHostel({ ...T, name: 'Boys Hostel' });
      expect(result.name).toBe('Boys Hostel');
    });
  });

  describe('findHostelById', () => {
    it('should return a hostel', async () => {
      mockDb.setDrizzleResults([{ id: 'h-1', name: 'Boys Hostel', deletedAt: null }]);
      const result = await service.findHostelById('h-1');
      expect(result.id).toBe('h-1');
    });
    it('should throw on missing hostel', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findHostelById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createRoom', () => {
    it('should create a room', async () => {
      mockDb.setDrizzleResults([{ id: 'rm-1' }], [{ id: 'rm-1', roomNumber: '101', hostelId: 'h-1' }]);
      const result = await service.createRoom({ hostelId: 'h-1', roomNumber: '101' });
      expect(result.roomNumber).toBe('101');
    });
  });

  describe('allocateBed', () => {
    it('should allocate a bed', async () => {
      mockDb.setDrizzleResults([{ id: 'al-1' }], [{ id: 'al-1', studentId: 's-1', roomId: 'rm-1' }]);
      const result = await service.allocateBed({ ...T, roomId: 'rm-1', studentId: 's-1', allocationDate: '2026-01-01' });
      expect(result.studentId).toBe('s-1');
    });
  });

  describe('deleteHostel', () => {
    it('should soft-delete a hostel', async () => {
      mockDb.setDrizzleResults([{ id: 'h-1', deletedAt: null }], []);
      const result = await service.deleteHostel('h-1');
      expect(result.success).toBe(true);
    });
  });
});
