import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { HrService } from './hr.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('HrService', () => {
  let service: HrService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [HrService, { provide: DatabaseProvider, useValue: mockDb }],
    }).compile();
    service = module.get<HrService>(HrService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  const T = { tenantId: 't-1', branchId: 'b-1' };

  // ═════════════════════════════════════════════════════════════════════════
  // STAFF
  // ═════════════════════════════════════════════════════════════════════════

  describe('createStaff', () => {
    const base = () => ({
      ...T,
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      designation: 'Teacher',
    });

    it('should create staff', async () => {
      mockDb.setDrizzleResults(
        [],
        [{ id: 's-1' }],
        [
          {
            id: 's-1',
            employeeCode: 'EMP001',
            firstName: 'John',
            lastName: 'Doe',
            designation: 'Teacher',
          },
        ],
      );
      const result = await service.createStaff(base());
      expect(result.firstName).toBe('John');
      expect(result.employeeCode).toBe('EMP001');
    });

    it('should reject duplicate employee code', async () => {
      mockDb.setDrizzleResults([{ id: 'existing' }]);
      await expect(service.createStaff(base())).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findStaffByBranch', () => {
    it('should return paginated staff', async () => {
      mockDb.setDrizzleResults(
        [{ id: 's-1', firstName: 'John', lastName: 'Doe', deletedAt: null }],
        [{ count: '1' }],
      );
      const result = await service.findStaffByBranch(T.branchId, {});
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findStaffById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findStaffById('bad', T.branchId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return staff', async () => {
      mockDb.setDrizzleResults([
        { id: 's-1', firstName: 'John', deletedAt: null },
      ]);
      const result = await service.findStaffById('s-1', T.branchId);
      expect(result.id).toBe('s-1');
    });
  });

  describe('updateStaff', () => {
    it('should update staff', async () => {
      mockDb.setDrizzleResults(
        [{ id: 's-1' }],
        [],
        [{ id: 's-1', firstName: 'Jane' }],
      );
      const result = await service.updateStaff('s-1', T.branchId, {
        firstName: 'Jane',
      });
      expect(result.firstName).toBe('Jane');
    });

    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.updateStaff('bad', T.branchId, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteStaff', () => {
    it('should soft delete', async () => {
      mockDb.setDrizzleResults([{ id: 's-1' }]);
      await expect(
        service.deleteStaff('s-1', T.branchId),
      ).resolves.not.toThrow();
    });

    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.deleteStaff('bad', T.branchId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── Staff Documents ──────────────────────────────────────────────────────

  describe('addStaffDocument', () => {
    it('should add document', async () => {
      mockDb.setDrizzleResults(
        [{ id: 's-1', deletedAt: null }],
        [{ tenantId: T.tenantId }],
        [{ id: 'doc-1' }],
        [{ id: 'doc-1', documentType: 'qualification' }],
      );
      const result = await service.addStaffDocument('s-1', T.branchId, {
        documentType: 'qualification',
        fileUrl: 'http://example.com/doc.pdf',
      });
      expect(result.id).toBe('doc-1');
    });

    it('should throw if staff missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.addStaffDocument('bad', T.branchId, {
          documentType: 'test',
          fileUrl: 'http://x.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findStaffDocuments', () => {
    it('should list documents', async () => {
      mockDb.setDrizzleResults(
        [{ id: 's-1', deletedAt: null }],
        [{ id: 'doc-1', documentType: 'qualification' }],
      );
      const result = await service.findStaffDocuments('s-1', T.branchId);
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteStaffDocument', () => {
    it('should delete document', async () => {
      mockDb.setDrizzleResults(
        [{ id: 's-1', deletedAt: null }],
        [{ id: 'doc-1' }],
      );
      await expect(
        service.deleteStaffDocument('doc-1', 's-1', T.branchId),
      ).resolves.not.toThrow();
    });

    it('should throw on missing doc', async () => {
      mockDb.setDrizzleResults([{ id: 's-1', deletedAt: null }], []);
      await expect(
        service.deleteStaffDocument('bad', 's-1', T.branchId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // LEAVE
  // ═════════════════════════════════════════════════════════════════════════

  describe('createLeaveType', () => {
    it('should create leave type', async () => {
      mockDb.setDrizzleResults(
        [],
        [{ id: 'lt-1' }],
        [{ id: 'lt-1', name: 'Annual', code: 'ANNUAL', daysAllowed: 20 }],
      );
      const result = await service.createLeaveType({
        tenantId: T.tenantId,
        name: 'Annual',
        code: 'ANNUAL',
        daysAllowed: 20,
      });
      expect(result.name).toBe('Annual');
    });

    it('should reject duplicate code', async () => {
      mockDb.setDrizzleResults([{ id: 'lt-1' }]);
      await expect(
        service.createLeaveType({
          tenantId: T.tenantId,
          name: 'Annual',
          code: 'ANNUAL',
          daysAllowed: 20,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findLeaveTypesByTenant', () => {
    it('should list leave types', async () => {
      mockDb.setDrizzleResults([{ id: 'lt-1', name: 'Annual' }]);
      const result = await service.findLeaveTypesByTenant(T.tenantId);
      expect(result).toHaveLength(1);
    });
  });

  describe('applyLeave', () => {
    it('should apply for leave', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'lt-1', daysAllowed: 20 }],
        [{ id: 'lr-1' }],
        [
          {
            id: 'lr-1',
            startDate: '2026-08-01',
            endDate: '2026-08-03',
            totalDays: 3,
            status: 'pending',
          },
        ],
      );
      const result = await service.applyLeave({
        ...T,
        staffId: 's-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-08-01',
        endDate: '2026-08-03',
      });
      expect(result.totalDays).toBe(3);
    });

    it('should reject invalid leave type', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.applyLeave({
          ...T,
          staffId: 's-1',
          leaveTypeId: 'bad',
          startDate: '2026-08-01',
          endDate: '2026-08-03',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject end before start', async () => {
      mockDb.setDrizzleResults([{ id: 'lt-1', daysAllowed: 20 }]);
      await expect(
        service.applyLeave({
          ...T,
          staffId: 's-1',
          leaveTypeId: 'lt-1',
          startDate: '2026-08-05',
          endDate: '2026-08-03',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewLeave', () => {
    it('should approve leave', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'lr-1', status: 'pending' }],
        [],
        [{ id: 'lr-1', status: 'approved' }],
      );
      const result = await service.reviewLeave(
        'lr-1',
        T.branchId,
        'approved',
        'u-1',
      );
      expect(result.status).toBe('approved');
    });

    it('should reject already reviewed leave', async () => {
      mockDb.setDrizzleResults([{ id: 'lr-1', status: 'approved' }]);
      await expect(
        service.reviewLeave('lr-1', T.branchId, 'approved', 'u-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.reviewLeave('bad', T.branchId, 'approved', 'u-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // PAYROLL
  // ═════════════════════════════════════════════════════════════════════════

  describe('createSalaryComponent', () => {
    it('should create salary component', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'comp-1' }],
        [{ id: 'comp-1', name: 'Basic', type: 'earning' }],
      );
      const result = await service.createSalaryComponent({
        ...T,
        name: 'Basic',
        type: 'earning',
      });
      expect(result.name).toBe('Basic');
    });
  });

  describe('findSalaryComponents', () => {
    it('should list components', async () => {
      mockDb.setDrizzleResults([
        { id: 'comp-1', name: 'Basic', type: 'earning', isActive: true },
      ]);
      const result = await service.findSalaryComponents(T.branchId);
      expect(result).toHaveLength(1);
    });
  });

  describe('processPayroll', () => {
    it('should process payroll', async () => {
      mockDb.setDrizzleResults(
        [],
        [{ basicSalary: '50000' }],
        [{ id: 'pr-1' }],
        [
          {
            id: 'pr-1',
            staffId: 's-1',
            month: 7,
            year: 2026,
            status: 'processed',
            netPay: '45000',
          },
        ],
      );
      const result = await service.processPayroll({
        ...T,
        staffId: 's-1',
        month: 7,
        year: 2026,
        basicPay: 50000,
        allowances: [{ componentId: 'c1', amount: 5000 }],
        deductions: [{ componentId: 'c2', amount: 10000 }],
        processedBy: 'u-1',
      });
      expect(result.status).toBe('processed');
      expect(result.netPay).toBe('45000');
    });

    it('should reject duplicate payroll', async () => {
      mockDb.setDrizzleResults([{ id: 'pr-1' }]);
      await expect(
        service.processPayroll({
          ...T,
          staffId: 's-1',
          month: 7,
          year: 2026,
          processedBy: 'u-1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findPayrollsByBranch', () => {
    it('should return payroll records', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'pr-1',
            staffId: 's-1',
            month: 7,
            year: 2026,
            status: 'processed',
          },
        ],
        [{ count: '1' }],
      );
      const result = await service.findPayrollsByBranch(T.branchId, {});
      expect(result.data).toHaveLength(1);
    });
  });
});
