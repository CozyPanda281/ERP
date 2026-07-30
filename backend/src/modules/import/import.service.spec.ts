import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImportService } from './import.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('ImportService', () => {
  let service: ImportService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('getSupportedEntityTypes', () => {
    it('should return registered entity types', () => {
      const types = service.getSupportedEntityTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(types.find(t => t.entityType === 'students')).toBeDefined();
      expect(types.find(t => t.entityType === 'users')).toBeDefined();
    });
  });

  describe('upload', () => {
    it('should reject empty buffer', async () => {
      const buffer = Buffer.from('');
      await expect(
        service.upload('t-1', 'u-1', 'students', buffer, 'test.csv'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should parse CSV and create batch', async () => {
      const csv = 'first_name,last_name,email\nJohn,Doe,john@test.com';
      const buffer = Buffer.from(csv);

      mockDb.setDrizzleResults([{ id: 'batch-1' }], [{ id: 'batch-1', status: 'pending_review', entityType: 'students' }]);

      const result = await service.upload('t-1', 'u-1', 'students', buffer, 'test.csv');
      expect(result).toBeDefined();
    });
  });

  describe('batch lifecycle', () => {
    it('should throw on nonexistent batch', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.getBatch('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should approve a batch', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'b-1', status: 'pending_review' }],
        [],
        [{ id: 'b-1', status: 'approved' }],
      );

      const result = await service.approve('b-1', 'u-1', 'Looks good');
      expect(result.status).toBe('approved');
    });

    it('should reject an approved batch', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'b-1', status: 'pending_review' }],
        [],
        [{ id: 'b-1', status: 'rejected' }],
      );

      const result = await service.reject('b-1', 'u-1', 'Bad data');
      expect(result.status).toBe('rejected');
    });

    it('should not approve already approved batch', async () => {
      mockDb.setDrizzleResults([{ id: 'b-1', status: 'approved' }]);
      await expect(service.approve('b-1', 'u-1')).rejects.toThrow(BadRequestException);
    });

    it('should not deploy unapproved batch', async () => {
      mockDb.setDrizzleResults([{ id: 'b-1', status: 'pending_review' }]);
      await expect(service.deploy('b-1', 'u-1')).rejects.toThrow(BadRequestException);
    });
  });
});
