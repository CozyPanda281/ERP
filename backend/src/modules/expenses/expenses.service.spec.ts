import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let mockDb: MockDatabaseProvider;
  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<ExpensesService>(ExpensesService);
  });
  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  describe('createExpenseCategory', () => {
    it('should create', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'ec-1' }],
        [{ id: 'ec-1', name: 'Utilities' }],
      );
      const r = await service.createExpenseCategory({
        tenantId: 't-1',
        name: 'Utilities',
      });
      expect(r.name).toBe('Utilities');
    });
  });
  describe('createExpense', () => {
    it('should create expense', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'ex-1' }],
        [{ id: 'ex-1', description: 'Electric bill', amount: '5000' }],
      );
      const r = await service.createExpense({
        tenantId: 't-1',
        branchId: 'b-1',
        amount: '5000',
        description: 'Electric bill',
        expenseDate: '2026-01-01',
      });
      expect(r.description).toBe('Electric bill');
    });
  });
  describe('findExpenseById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findExpenseById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
