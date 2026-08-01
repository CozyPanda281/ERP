import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('AccountingService', () => {
  let service: AccountingService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<AccountingService>(AccountingService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  const T = { tenantId: 't-1', branchId: 'b-1' };

  // ═════════════════════════════════════════════════════════════════════════
  // ACCOUNTS
  // ═════════════════════════════════════════════════════════════════════════

  describe('createAccount', () => {
    const base = () => ({
      ...T,
      accountCode: '1000',
      accountName: 'Cash',
      accountType: 'asset' as const,
    });

    it('should create an account', async () => {
      mockDb.setDrizzleResults(
        [], // no duplicate
        [{ id: 'a-1' }], // insert
        [
          {
            id: 'a-1',
            accountCode: '1000',
            accountName: 'Cash',
            accountType: 'asset',
            tenantId: T.tenantId,
            branchId: T.branchId,
          },
        ], // select after insert
      );
      const result = await service.createAccount(base());
      expect(result.accountCode).toBe('1000');
      expect(result.accountName).toBe('Cash');
      expect(result.accountType).toBe('asset');
    });

    it('should reject duplicate account code', async () => {
      mockDb.setDrizzleResults([{ id: 'existing' }]);
      await expect(service.createAccount(base())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAccountById', () => {
    it('should return account', async () => {
      mockDb.setDrizzleResults([
        {
          id: 'a-1',
          accountCode: '1000',
          accountName: 'Cash',
          accountType: 'asset',
        },
      ]);
      const result = await service.findAccountById('a-1');
      expect(result.id).toBe('a-1');
    });

    it('should throw on missing account', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findAccountById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAccountsByBranch', () => {
    it('should return paginated accounts', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'a-1',
            accountCode: '1000',
            accountName: 'Cash',
            accountType: 'asset',
            deletedAt: null,
          },
        ],
        [{ count: '1' }],
      );
      const result = await service.findAccountsByBranch(T.branchId, {});
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // JOURNAL ENTRIES
  // ═════════════════════════════════════════════════════════════════════════

  describe('createJournalEntry', () => {
    const base = () => ({
      ...T,
      entryDate: '2026-07-31',
      items: [
        { accountId: 'a-1', debit: 1000, credit: 0 },
        { accountId: 'a-2', debit: 0, credit: 1000 },
      ],
    });

    it('should create a balanced journal entry', async () => {
      mockDb.setDrizzleResults(
        [], // insert journal entry
        [], // insert item 1
        [], // insert item 2
        [{ id: 'je-1', entryNumber: 'JE-123', entryDate: '2026-07-31' }], // select journal entry
        [
          { id: 'i-1', accountId: 'a-1', debit: '1000', credit: '0' },
          { id: 'i-2', accountId: 'a-2', debit: '0', credit: '1000' },
        ], // select items
      );
      const result = await service.createJournalEntry(base());
      expect(result.entryNumber).toBeDefined();
      expect(result.items).toHaveLength(2);
    });

    it('should reject unbalanced entry', async () => {
      const dto = base();
      dto.items = [
        { accountId: 'a-1', debit: 100, credit: 0 },
        { accountId: 'a-2', debit: 0, credit: 50 },
      ];
      await expect(service.createJournalEntry(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject entry with less than 2 items', async () => {
      const dto = base();
      dto.items = [{ accountId: 'a-1', debit: 100, credit: 0 }];
      await expect(service.createJournalEntry(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TRIAL BALANCE
  // ═════════════════════════════════════════════════════════════════════════

  describe('getTrialBalance', () => {
    it('should return trial balance rows', async () => {
      mockDb.setMockResult('FROM accounting_accounts a', {
        rows: [
          {
            id: 'a-1',
            account_code: '1000',
            account_name: 'Cash',
            account_type: 'asset',
            total_debit: '1000',
            total_credit: '0',
            balance: '1000',
          },
          {
            id: 'a-2',
            account_code: '2000',
            account_name: 'AP',
            account_type: 'liability',
            total_debit: '0',
            total_credit: '1000',
            balance: '-1000',
          },
        ],
      });
      const result = await service.getTrialBalance(
        T.branchId,
        '2026-01-01',
        '2026-12-31',
      );
      expect(result).toHaveLength(2);
      expect(result[0].account_type).toBe('asset');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // INCOME STATEMENT
  // ═════════════════════════════════════════════════════════════════════════

  describe('getIncomeStatement', () => {
    it('should return income statement with net income', async () => {
      mockDb.setMockResult('account_type IN', {
        rows: [
          {
            id: 'a-10',
            account_code: '4000',
            account_name: 'Fees',
            account_type: 'income',
            total_debit: '0',
            total_credit: '50000',
            balance: '50000',
          },
          {
            id: 'a-11',
            account_code: '5000',
            account_name: 'Salaries',
            account_type: 'expense',
            total_debit: '30000',
            total_credit: '0',
            balance: '30000',
          },
        ],
      });
      const result = await service.getIncomeStatement(
        T.branchId,
        '2026-01-01',
        '2026-12-31',
      );
      expect(result.accounts).toHaveLength(2);
      expect(Number(result.totalIncome)).toBe(50000);
      expect(Number(result.totalExpense)).toBe(30000);
      expect(Number(result.netIncome)).toBe(20000);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // BALANCE SHEET
  // ═════════════════════════════════════════════════════════════════════════

  describe('getBalanceSheet', () => {
    it('should return balance sheet with assets = liabilities + equity', async () => {
      mockDb.setMockResult('account_type IN', {
        rows: [
          {
            id: 'a-1',
            account_code: '1000',
            account_name: 'Cash',
            account_type: 'asset',
            total_debit: '50000',
            total_credit: '0',
            balance: '50000',
          },
          {
            id: 'a-2',
            account_code: '2000',
            account_name: 'AP',
            account_type: 'liability',
            total_debit: '0',
            total_credit: '10000',
            balance: '10000',
          },
          {
            id: 'a-3',
            account_code: '3000',
            account_name: 'Equity',
            account_type: 'equity',
            total_debit: '0',
            total_credit: '40000',
            balance: '40000',
          },
        ],
      });
      const result = await service.getBalanceSheet(T.branchId, '2026-12-31');
      expect(result.assets).toHaveLength(1);
      expect(result.liabilities).toHaveLength(1);
      expect(result.equity).toHaveLength(1);
      expect(Number(result.totalAssets)).toBe(50000);
      expect(Number(result.totalLiabilitiesEquity)).toBe(50000);
    });
  });
});
