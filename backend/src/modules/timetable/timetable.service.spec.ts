import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('TimetableService', () => {
  let service: TimetableService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<TimetableService>(TimetableService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a timetable', async () => {
      mockDb.setDrizzleResults(
        [], // no existing
        [{ id: 'tt-1' }], // insert returning
        [{ id: 'tt-1', name: 'Spring 2026', branchId: 'b-1' }], // findById select
        [], // findById entries
      );
      const result = await service.create({
        tenantId: 't-1',
        branchId: 'b-1',
        name: 'Spring 2026',
        classId: 'c-1',
      });
      expect(result.name).toBe('Spring 2026');
    });

    it('should reject duplicate name', async () => {
      mockDb.setDrizzleResults([{ id: 'tt-1' }]);
      await expect(
        service.create({
          tenantId: 't-1',
          branchId: 'b-1',
          name: 'Duplicate',
          classId: 'c-1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addEntry', () => {
    it('should add entry with overlap check', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'tt-1', tenantId: 't-1' }], // select timetable
        [], // overlap check
        [{ id: 'e-1' }], // insert returning
      );
      const result = await service.addEntry('tt-1', {
        dayOfWeek: 0,
        subjectId: 'sub-1',
        startTime: '08:00',
        endTime: '08:45',
      });
      expect(result.id).toBe('e-1');
    });

    it('should reject overlapping time', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'tt-1', tenantId: 't-1' }], // select timetable
        [{ id: 'e-1' }], // overlap found
      );
      await expect(
        service.addEntry('tt-1', {
          dayOfWeek: 0,
          subjectId: 'sub-1',
          startTime: '08:00',
          endTime: '09:00',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('setActive', () => {
    it('should activate and deactivate others', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'tt-1', branchId: 'b-1', classId: 'c-1' }], // findById select
        [], // findById entries
        [], // deactivate all
        [], // activate target
        [{ id: 'tt-1', isActive: true }], // findById select
        [], // findById entries
      );
      const result = await service.setActive('tt-1');
      expect(result.isActive).toBe(true);
    });
  });

  describe('removeEntry', () => {
    it('should throw on missing entry', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.removeEntry('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
