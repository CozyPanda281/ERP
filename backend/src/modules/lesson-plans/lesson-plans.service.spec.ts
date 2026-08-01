import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LessonPlansService } from './lesson-plans.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('LessonPlansService', () => {
  let service: LessonPlansService;
  let mockDb: MockDatabaseProvider;
  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonPlansService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<LessonPlansService>(LessonPlansService);
  });
  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create lesson plan', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'lp-1' }],
        [{ id: 'lp-1', title: 'Algebra' }],
      );
      const r = await service.create({
        tenantId: 't-1',
        branchId: 'b-1',
        teacherId: 'tch-1',
        subjectId: 'sub-1',
        classId: 'c-1',
        title: 'Algebra',
      });
      expect(r.title).toBe('Algebra');
    });
  });
  describe('findById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
    });
  });
});
