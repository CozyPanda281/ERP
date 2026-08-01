import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('HomeworkService', () => {
  let service: HomeworkService;
  let mockDb: MockDatabaseProvider;
  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeworkService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<HomeworkService>(HomeworkService);
  });
  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('createHomework', () => {
    it('should create homework', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'hw-1' }],
        [{ id: 'hw-1', title: 'Math HW' }],
      );
      const r = await service.createHomework({
        tenantId: 't-1',
        branchId: 'b-1',
        classId: 'c-1',
        subjectId: 'sub-1',
        teacherId: 'tch-1',
        title: 'Math HW',
        dueDate: '2026-02-01',
      });
      expect(r.title).toBe('Math HW');
    });
  });
  describe('findHomeworkById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findHomeworkById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
  describe('gradeSubmission', () => {
    it('should throw on missing submission', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.gradeSubmission('bad', '85')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
