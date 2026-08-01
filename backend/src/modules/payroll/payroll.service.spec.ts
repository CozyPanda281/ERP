import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('PayrollService', () => {
  let service: PayrollService;
  let mockDb: MockDatabaseProvider;
  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<PayrollService>(PayrollService);
  });
  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('createSalaryComponent', () => {
    it('should create', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'sc-1' }],
        [{ id: 'sc-1', name: 'HRA', type: 'allowance' }],
      );
      const r = await service.createSalaryComponent({
        tenantId: 't-1',
        branchId: 'b-1',
        name: 'HRA',
        type: 'allowance',
      });
      expect(r.name).toBe('HRA');
    });
  });
  describe('findPayrollById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findPayrollById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
  describe('processPayroll', () => {
    it('should process payroll', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'pr-1' }],
        [{ id: 'pr-1', staffId: 's-1', month: 1, year: 2026 }],
      );
      const r = await service.processPayroll({
        tenantId: 't-1',
        branchId: 'b-1',
        staffId: 's-1',
        month: 1,
        year: 2026,
      });
      expect(r.staffId).toBe('s-1');
    });
  });
});
