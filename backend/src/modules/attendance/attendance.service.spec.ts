import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { DatabaseProvider } from '../../database/database.provider';
import { WebhooksService } from '../webhooks/webhooks.service';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: DatabaseProvider, useValue: mockDb },
        { provide: WebhooksService, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  const VALID_PAST_DATE = '2026-07-01'; // Wednesday (dayOfWeek = 3)
  const MOCK_ENTRY = {
    id: 'te-1',
    tenantId: 't-1',
    subjectId: 'sub-1',
    dayOfWeek: 3,
    startTime: '08:00',
    endTime: '08:45',
  };

  const baseParams = () => ({
    tenantId: 't-1',
    branchId: 'b-1',
    createdBy: 'u-1',
    timetableEntryId: 'te-1',
    date: VALID_PAST_DATE,
    records: [
      { studentId: 's-1', status: 'present' },
      { studentId: 's-2', status: 'absent' },
    ],
  });

  const expectedSession = {
    id: 'att-1',
    totalPresent: 1,
    totalAbsent: 1,
    totalStudents: 2,
    records: [
      {
        id: 'ar-1',
        studentId: 's-1',
        status: 'present',
        firstName: 'John',
        lastName: 'Doe',
        admissionNumber: 'A001',
        rollNumber: '1',
        markedBy: 'u-1',
        createdAt: null,
        remarks: null,
      },
      {
        id: 'ar-2',
        studentId: 's-2',
        status: 'absent',
        firstName: 'Jane',
        lastName: 'Doe',
        admissionNumber: 'A002',
        rollNumber: '2',
        markedBy: 'u-1',
        createdAt: null,
        remarks: null,
      },
    ],
  };

  // ─── createSession ─────────────────────────────────────────────────────

  describe('createSession', () => {
    it('should create session with records', async () => {
      mockDb.setDrizzleResults(
        [MOCK_ENTRY], // validateTimetableEntry
        [{ id: 's-1' }, { id: 's-2' }], // validateStudents
        [], // existingSession check
        [{ id: 'att-1' }], // tx: insert attendance session
        [], // tx: insert attendance records
        [], // tx: update attendance counts
        [{ id: 'att-1', totalPresent: 1, totalAbsent: 1, totalStudents: 2 }], // getSessionById: session
        [
          // getSessionById: records
          {
            id: 'ar-1',
            studentId: 's-1',
            status: 'present',
            firstName: 'John',
            lastName: 'Doe',
            admissionNumber: 'A001',
            rollNumber: '1',
            markedBy: 'u-1',
            createdAt: null,
            remarks: null,
          },
          {
            id: 'ar-2',
            studentId: 's-2',
            status: 'absent',
            firstName: 'Jane',
            lastName: 'Doe',
            admissionNumber: 'A002',
            rollNumber: '2',
            markedBy: 'u-1',
            createdAt: null,
            remarks: null,
          },
        ],
      );
      const result = await service.createSession(baseParams());
      expect(result.id).toBe('att-1');
      expect(result.records).toHaveLength(2);
    });

    it('should reject future date', async () => {
      mockDb.setDrizzleResults([MOCK_ENTRY]);
      const nextYear = (new Date().getFullYear() + 1).toString();
      await expect(
        service.createSession({ ...baseParams(), date: `${nextYear}-01-01` }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when no students provided', async () => {
      mockDb.setDrizzleResults([MOCK_ENTRY]);
      await expect(
        service.createSession({ ...baseParams(), records: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid student id', async () => {
      mockDb.setDrizzleResults([MOCK_ENTRY], [{ id: 's-1' }]);
      const params = baseParams();
      params.records = [
        { studentId: 's-1', status: 'present' },
        { studentId: 'bad-student', status: 'absent' },
      ];
      await expect(service.createSession(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject timetable entry from different branch', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.createSession(baseParams())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject duplicate session', async () => {
      mockDb.setDrizzleResults(
        [MOCK_ENTRY],
        [{ id: 's-1' }, { id: 's-2' }],
        [{ id: 'att-1' }],
      );
      await expect(service.createSession(baseParams())).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject day-of-week mismatch', async () => {
      mockDb.setDrizzleResults(
        [{ ...MOCK_ENTRY, dayOfWeek: 6 }],
        [{ id: 's-1' }, { id: 's-2' }],
      );
      await expect(service.createSession(baseParams())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── getSessionById ──────────────────────────────────────────────────────

  describe('getSessionById', () => {
    it('should return session with records', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'att-1', date: VALID_PAST_DATE }],
        [
          {
            id: 'ar-1',
            studentId: 's-1',
            status: 'present',
            firstName: 'John',
            lastName: 'Doe',
            admissionNumber: 'A001',
            rollNumber: '1',
            markedBy: 'u-1',
            createdAt: null,
            remarks: null,
          },
        ],
      );
      const result = await service.getSessionById('att-1', 'b-1');
      expect(result.id).toBe('att-1');
      expect(result.records).toHaveLength(1);
    });

    it('should throw on missing session', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.getSessionById('bad', 'b-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── updateRecord ────────────────────────────────────────────────────────

  describe('updateRecord', () => {
    it('should update record status', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'ar-1', attendanceId: 'att-1' }], // find record with join
        [], // update attendanceRecords
        [{ present: 1, absent: 0 }], // recalculateSession: select counts
        [], // recalculateSession: update attendance
        [{ id: 'ar-1', status: 'late' }], // select updated record
      );
      const result = await service.updateRecord('ar-1', 'b-1', {
        status: 'late',
      });
      expect(result.status).toBe('late');
    });

    it('should throw on record not found', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.updateRecord('bad', 'b-1', { status: 'present' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findByBranch ────────────────────────────────────────────────────────

  describe('findByBranch', () => {
    it('should return paginated sessions', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'att-1',
            date: VALID_PAST_DATE,
            className: 'Class 1',
            subjectName: 'Math',
          },
        ],
        [{ count: '1' }],
      );
      const result = await service.findByBranch('b-1', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  // ─── findByStudent ───────────────────────────────────────────────────────

  describe('findByStudent', () => {
    it('should return student attendance records', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'ar-1',
            date: VALID_PAST_DATE,
            status: 'present',
            subjectName: 'Math',
          },
        ],
        [{ count: '1' }],
      );
      const result = await service.findByStudent('s-1', 'b-1', {});
      expect(result.data).toHaveLength(1);
    });
  });

  // ─── getSummary ──────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('should return attendance stats', async () => {
      mockDb.setDrizzleResults([
        { total: '10', present: '8', absent: '1', late: '1', excused: '0' },
      ]);
      const result = await service.getSummary('s-1', 'b-1', {});
      expect(result.total).toBe(10);
      expect(result.present).toBe(8);
      expect(result.late).toBe(1);
      expect(result.percentage).toBe(90);
    });

    it('should return zeros for no records', async () => {
      mockDb.setDrizzleResults([
        { total: '0', present: '0', absent: '0', late: '0', excused: '0' },
      ]);
      const result = await service.getSummary('s-1', 'b-1', {});
      expect(result.percentage).toBe(0);
    });
  });

  // ─── getDailyReport ──────────────────────────────────────────────────────

  describe('getDailyReport', () => {
    it('should return daily report', async () => {
      mockDb.setDrizzleResults([
        {
          id: 'att-1',
          className: 'Class 1',
          subjectName: 'Math',
          totalPresent: '25',
          totalAbsent: '3',
          totalStudents: '28',
          startTime: '08:00',
          endTime: '08:45',
          classId: 'c-1',
        },
        {
          id: 'att-2',
          className: 'Class 1',
          subjectName: 'Science',
          totalPresent: '24',
          totalAbsent: '4',
          totalStudents: '28',
          startTime: '09:00',
          endTime: '09:45',
          classId: 'c-1',
        },
      ]);
      const result = await service.getDailyReport('b-1', VALID_PAST_DATE);
      expect(result.sessions).toHaveLength(2);
      expect(result.summary.present).toBe(49);
      expect(result.summary.absent).toBe(7);
      expect(result.summary.total).toBe(56);
    });

    it('should reject future date for report', async () => {
      const nextYear = (new Date().getFullYear() + 1).toString();
      await expect(
        service.getDailyReport('b-1', `${nextYear}-01-01`),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
