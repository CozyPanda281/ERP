import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StaffService } from './staff.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('StaffService', () => {
  let service: StaffService;
  let mockDb: MockDatabaseProvider;
  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<StaffService>(StaffService);
  });
  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });
  const T = { tenantId: 't-1', branchId: 'b-1' };

  describe('create', () => {
    it('should create staff', async () => {
      mockDb.setDrizzleResults(
        [{ id: 's-1' }],
        [{ id: 's-1', firstName: 'John', deletedAt: null }],
      );
      const r = await service.create({
        ...T,
        employeeCode: 'E001',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(r.firstName).toBe('John');
    });
  });
  describe('findById', () => {
    it('should return staff', async () => {
      mockDb.setDrizzleResults([
        { id: 's-1', firstName: 'John', deletedAt: null },
      ]);
      expect((await service.findById('s-1')).id).toBe('s-1');
    });
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
    });
  });
  describe('delete', () => {
    it('should soft-delete', async () => {
      mockDb.setDrizzleResults([{ id: 's-1', deletedAt: null }], []);
      expect((await service.delete('s-1')).success).toBe(true);
    });
  });
});
