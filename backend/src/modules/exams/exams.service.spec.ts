import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('ExamsService', () => {
  let service: ExamsService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<ExamsService>(ExamsService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  const baseParams = () => ({
    tenantId: 't-1',
    branchId: 'b-1',
    name: 'Mid Term 2026',
    examType: 'quarterly',
    classId: 'c-1',
    academicYearId: 'ay-1',
    startDate: '2026-09-01',
    endDate: '2026-09-10',
  });

  // ─── createExam ──────────────────────────────────────────────────────────

  describe('createExam', () => {
    it('should create an exam', async () => {
      mockDb.setDrizzleResults(
        [], // no duplicate
        [{ id: 'exam-1' }], // insert returning
        [{ id: 'exam-1', name: 'Mid Term 2026' }], // findById
      );
      const result = await service.createExam(baseParams());
      expect(result.id).toBe('exam-1');
    });

    it('should reject duplicate name', async () => {
      mockDb.setDrizzleResults([{ id: 'exam-1' }]);
      await expect(service.createExam(baseParams())).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject end date before start date', async () => {
      mockDb.setDrizzleResults([]);
      const params = {
        ...baseParams(),
        startDate: '2026-09-10',
        endDate: '2026-09-01',
      };
      await expect(service.createExam(params)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── findExamById ────────────────────────────────────────────────────────

  describe('findExamById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findExamById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── createSchedule ──────────────────────────────────────────────────────

  describe('createSchedule', () => {
    const scheduleParams = {
      subjectId: 'sub-1',
      date: '2026-09-05',
      maxMarks: 100,
      passMarks: 33,
    };

    it('should create a schedule', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'exam-1' }], // findExamById
        [], // no duplicate
        [{ id: 'sch-1' }], // insert returning
        [{ id: 'sch-1', subjectId: 'sub-1', subjectName: 'Math' }], // findScheduleById
      );
      const result = await service.createSchedule('exam-1', scheduleParams);
      expect(result.id).toBe('sch-1');
    });

    it('should reject duplicate subject schedule', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'exam-1' }],
        [{ id: 'sch-1' }], // existing found
      );
      await expect(
        service.createSchedule('exam-1', scheduleParams),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject pass marks exceeding max marks', async () => {
      mockDb.setDrizzleResults([{ id: 'exam-1' }], []);
      await expect(
        service.createSchedule('exam-1', {
          ...scheduleParams,
          maxMarks: 50,
          passMarks: 60,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── bulkEnterMarks ──────────────────────────────────────────────────────

  describe('bulkEnterMarks', () => {
    const marksParams = () => ({
      tenantId: 't-1',
      branchId: 'b-1',
      enteredBy: 'u-1',
      examScheduleId: 'sch-1',
      marks: [
        { studentId: 's-1', marksObtained: 85 },
        { studentId: 's-2', marksObtained: 92 },
      ],
    });

    it('should bulk enter marks', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'sch-1', maxMarks: 100 }], // find schedule
        [{ id: 's-1' }, { id: 's-2' }], // validate students
        [], // check existing marks
        [], // insert marks
        [{ id: 'm-1', studentId: 's-1', marksObtained: '85' }], // findMarksBySchedule data
        [{ count: '2' }], // findMarksBySchedule total
      );
      const result = await service.bulkEnterMarks(marksParams());
      expect(result.data).toBeDefined();
    });

    it('should reject marks exceeding max marks', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'sch-1', maxMarks: 100 }],
        [{ id: 's-1' }],
      );
      await expect(
        service.bulkEnterMarks({
          ...marksParams(),
          marks: [{ studentId: 's-1', marksObtained: 150 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject absent student with marks', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'sch-1', maxMarks: 100 }],
        [{ id: 's-1' }],
      );
      await expect(
        service.bulkEnterMarks({
          ...marksParams(),
          marks: [{ studentId: 's-1', marksObtained: 85, isAbsent: true }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate marks entry', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'sch-1', maxMarks: 100 }],
        [{ id: 's-1' }, { id: 's-2' }],
        [{ studentId: 's-1' }], // existing marks found
      );
      await expect(service.bulkEnterMarks(marksParams())).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject invalid student', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'sch-1', maxMarks: 100 }],
        [{ id: 's-1' }], // only one found, two provided
      );
      await expect(service.bulkEnterMarks(marksParams())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── generateResults ─────────────────────────────────────────────────────

  describe('generateResults', () => {
    it('should generate results', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'exam-1', tenantId: 't-1', branchId: 'b-1' }], // findExamById (in generateResults)
        [{ id: 'sch-1' }, { id: 'sch-2' }], // schedules
        [
          { scheduleId: 'sch-1', count: 2 },
          { scheduleId: 'sch-2', count: 2 },
        ], // marks present for all
        [
          // examMarks
          {
            studentId: 's-1',
            marksObtained: '85',
            maxMarks: 100,
            isAbsent: false,
          },
          {
            studentId: 's-2',
            marksObtained: '92',
            maxMarks: 100,
            isAbsent: false,
          },
          {
            studentId: 's-1',
            marksObtained: '78',
            maxMarks: 100,
            isAbsent: false,
          },
          {
            studentId: 's-2',
            marksObtained: '88',
            maxMarks: 100,
            isAbsent: false,
          },
        ],
        [], // delete existing results
        [], // insert results
        [], // update ranks (s-1)
        [], // update ranks (s-2)
        [{ id: 'exam-1' }], // findExamById (inside findResultsByExam)
        [
          // findResultsByExam select
          {
            id: 'r-1',
            studentId: 's-1',
            totalMarks: '163',
            percentage: '81.50',
            grade: 'A',
            rank: 2,
            resultStatus: 'pass',
            firstName: 'John',
            lastName: 'Doe',
            admissionNumber: 'A001',
            rollNumber: '1',
          },
          {
            id: 'r-2',
            studentId: 's-2',
            totalMarks: '180',
            percentage: '90.00',
            grade: 'A+',
            rank: 1,
            resultStatus: 'pass',
            firstName: 'Jane',
            lastName: 'Doe',
            admissionNumber: 'A002',
            rollNumber: '2',
          },
        ],
      );
      const results = await service.generateResults('exam-1');
      expect(results).toHaveLength(2);
    });

    it('should reject generation with missing marks', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'exam-1' }],
        [{ id: 'sch-1' }, { id: 'sch-2' }],
        [{ scheduleId: 'sch-1', count: 2 }], // only sch-1 has marks
      );
      await expect(service.generateResults('exam-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── findResultsByExam ───────────────────────────────────────────────────

  describe('findResultsByExam', () => {
    it('should return results', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'exam-1' }],
        [
          {
            id: 'r-1',
            studentId: 's-1',
            totalMarks: '163',
            percentage: '81.50',
            grade: 'A',
            rank: 2,
            resultStatus: 'pass',
            firstName: 'John',
            lastName: 'Doe',
            admissionNumber: 'A001',
            rollNumber: '1',
          },
        ],
      );
      const results = await service.findResultsByExam('exam-1');
      expect(results).toHaveLength(1);
    });
  });

  // ─── findResultByStudent ─────────────────────────────────────────────────

  describe('findResultByStudent', () => {
    it('should return student result with subjects', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'r-1',
            totalMarks: '163',
            percentage: '81.50',
            grade: 'A',
            rank: 2,
            resultStatus: 'pass',
            remarks: null,
            examName: 'Mid Term',
          },
        ],
        [
          {
            subjectName: 'Math',
            marksObtained: '85',
            maxMarks: 100,
            grade: 'A',
            isAbsent: false,
          },
        ],
      );
      const result = await service.findResultByStudent('s-1', 'exam-1');
      expect(result.examName).toBe('Mid Term');
      expect(result.subjects).toHaveLength(1);
    });
  });

  // ─── getSubjectMarks ─────────────────────────────────────────────────────

  describe('getSubjectMarks', () => {
    it('should return subject-wise marks', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'exam-1' }],
        [
          {
            scheduleId: 'sch-1',
            subjectName: 'Math',
            marksObtained: '85',
            maxMarks: 100,
            passMarks: 33,
            grade: 'A',
            gradePoint: null,
            isAbsent: false,
          },
        ],
      );
      const result = await service.getSubjectMarks('exam-1', 's-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── findMarksByStudent ──────────────────────────────────────────────────

  describe('findMarksByStudent', () => {
    it('should return marks across exams', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'm-1',
            marksObtained: '85',
            maxMarks: 100,
            isAbsent: false,
            grade: 'A',
            gradePoint: null,
            examName: 'Mid Term',
            subjectName: 'Math',
            examDate: '2026-09-05',
          },
        ],
        [{ count: '1' }],
      );
      const result = await service.findMarksByStudent('s-1', 'b-1', {});
      expect(result.data).toHaveLength(1);
    });
  });

  // ─── updateMark ──────────────────────────────────────────────────────────

  describe('updateMark', () => {
    it('should update a mark', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'm-1',
            examScheduleId: 'sch-1',
            maxMarks: 100,
            studentId: 's-1',
          },
        ],
        [],
        [{ id: 'm-1', marksObtained: '95', maxMarks: 100 }],
      );
      const result = await service.updateMark('m-1', 'b-1', {
        marksObtained: 95,
      });
      expect(result.marksObtained).toBe('95');
    });

    it('should exceed max marks', async () => {
      mockDb.setDrizzleResults([
        { id: 'm-1', examScheduleId: 'sch-1', maxMarks: 100, studentId: 's-1' },
      ]);
      await expect(
        service.updateMark('m-1', 'b-1', { marksObtained: 150 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
