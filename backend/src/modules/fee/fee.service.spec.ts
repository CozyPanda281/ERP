import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FeeService } from './fee.service';
import { DatabaseProvider } from '../../database/database.provider';
import { WebhooksService } from '../webhooks/webhooks.service';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('FeeService', () => {
  let service: FeeService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeeService,
        { provide: DatabaseProvider, useValue: mockDb },
        { provide: WebhooksService, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get<FeeService>(FeeService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  // ─── createStructure ─────────────────────────────────────────────────────

  describe('createStructure', () => {
    const baseParams = () => ({
      tenantId: 't-1',
      branchId: 'b-1',
      name: 'Class 10 Fee',
      classId: 'c-1',
      frequency: 'monthly',
      items: [
        { name: 'Tuition', amount: 5000 },
        { name: 'Library', amount: 500 },
      ],
    });

    it('should create a fee structure with items', async () => {
      const expected = {
        id: 'fs-1',
        name: 'Class 10 Fee',
        className: 'Class 10',
        items: [
          {
            id: 'fi-1',
            name: 'Tuition',
            amount: '5000',
            sortOrder: 0,
            isOptional: false,
            isRecurring: true,
            frequency: 'monthly',
            dueDay: null,
          },
          {
            id: 'fi-2',
            name: 'Library',
            amount: '500',
            sortOrder: 1,
            isOptional: false,
            isRecurring: true,
            frequency: 'monthly',
            dueDay: null,
          },
        ],
      };
      mockDb.setDrizzleResults(
        [], // duplicate name check
        [{ id: 'fs-1' }], // tx: insert fee structure
        [], // tx: insert fee items
        [expected], // findStructureById: structure
        [
          // findStructureById: items
          {
            id: 'fi-1',
            name: 'Tuition',
            amount: '5000',
            sortOrder: 0,
            isOptional: false,
            isRecurring: true,
            frequency: 'monthly',
            dueDay: null,
          },
          {
            id: 'fi-2',
            name: 'Library',
            amount: '500',
            sortOrder: 1,
            isOptional: false,
            isRecurring: true,
            frequency: 'monthly',
            dueDay: null,
          },
        ],
      );
      const result = (await service.createStructure(baseParams())) as any;
      expect(result.name).toBe('Class 10 Fee');
      expect(result.items).toHaveLength(2);
    });

    it('should reject duplicate name', async () => {
      mockDb.setDrizzleResults([{ id: 'fs-1' }]);
      await expect(service.createStructure(baseParams())).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject empty items', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.createStructure({ ...baseParams(), items: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative amount', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.createStructure({
          ...baseParams(),
          items: [{ name: 'Fee', amount: -100 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findStructureById ──────────────────────────────────────────────────

  describe('findStructureById', () => {
    it('should throw on missing', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findStructureById('bad')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return structure with items', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'fs-1', name: 'Class 10 Fee', className: 'Class 10' }],
        [
          {
            id: 'fi-1',
            name: 'Tuition',
            amount: '5000',
            sortOrder: 0,
            isOptional: false,
            isRecurring: true,
            frequency: 'monthly',
            dueDay: null,
          },
        ],
      );
      const result = await service.findStructureById('fs-1');
      expect(result.name).toBe('Class 10 Fee');
      expect(result.items).toHaveLength(1);
    });
  });

  // ─── addItem ─────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('should add an item to structure', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'fs-1',
            tenantId: 't-1',
            branchId: 'b-1',
            name: 'Class 10 Fee',
            className: 'Class 10',
          },
        ],
        [{ id: 'fi-1', name: 'Tuition', amount: '5000' }],
        [{ id: 'fi-1' }],
        [{ id: 'fi-1', name: 'Sports Fee', amount: '1000' }],
      );
      const result = await service.addItem('fs-1', {
        name: 'Sports Fee',
        amount: 1000,
      });
      expect(result.name).toBe('Sports Fee');
    });
  });

  // ─── createDiscount ──────────────────────────────────────────────────────

  describe('createDiscount', () => {
    it('should create a discount', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'disc-1' }],
        [{ id: 'disc-1', name: 'Sibling Discount' }],
      );
      const result = await service.createDiscount({
        tenantId: 't-1',
        branchId: 'b-1',
        name: 'Sibling Discount',
        discountType: 'percentage',
        value: 10,
      });
      expect(result.name).toBe('Sibling Discount');
    });
  });

  // ─── assignFeeStructure ──────────────────────────────────────────────────

  describe('assignFeeStructure', () => {
    it('should assign structure to students', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'fs-1', name: 'Class 10 Fee', className: 'Class 10' }],
        [],
        [{ id: 's-1' }, { id: 's-2' }],
        [{ id: 's-1' }, { id: 's-2' }],
        [{ id: 'acc-1', studentId: 's-1', totalFee: '5500', totalDue: '5500' }],
      );
      const result = await service.assignFeeStructure({
        tenantId: 't-1',
        branchId: 'b-1',
        feeStructureId: 'fs-1',
        studentIds: ['s-1', 's-2'],
      });
      expect(result).toHaveLength(1);
    });

    it('should reject invalid student', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'fs-1', name: 'Class 10 Fee', className: 'Class 10' }],
        [],
        [{ id: 's-1' }],
      );
      await expect(
        service.assignFeeStructure({
          tenantId: 't-1',
          branchId: 'b-1',
          feeStructureId: 'fs-1',
          studentIds: ['s-1', 'bad-student'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── recordPayment ───────────────────────────────────────────────────────

  describe('recordPayment', () => {
    it('should record a payment', async () => {
      mockDb.setDrizzleResults(
        [{ id: 's-1' }],
        [
          {
            id: 'txn-1',
            transactionNo: 'TXN-B1-123',
            amount: '5000',
            paymentMethod: 'cash',
            status: 'completed',
            paidDate: '2026-07-01',
            referenceNumber: null,
          },
        ],
        [], // tx: insert receipt
        [], // tx: select student fee account
        [
          {
            id: 'txn-1',
            transactionNo: 'TXN-B1-123',
            amount: '5000',
            paymentMethod: 'cash',
            status: 'completed',
            paidDate: '2026-07-01',
            referenceNumber: null,
          },
        ],
      );
      const data = await service.recordPayment({
        tenantId: 't-1',
        branchId: 'b-1',
        createdBy: 'u-1',
        studentId: 's-1',
        amount: 5000,
        paymentMethod: 'cash',
      });
      const row = Array.isArray(data) ? data[0] : data;
      expect(row.transactionNo).toContain('TXN-');
      expect(row.amount).toBe('5000');
    });

    it('should reject payment exceeding invoice balance', async () => {
      mockDb.setDrizzleResults(
        [{ id: 's-1' }],
        [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-001',
            balanceDue: '3000',
            amountPaid: '0',
            totalAmount: '5000',
            subtotal: '5000',
            items: [],
            invoiceDate: '2026-07-01',
            discountTotal: '0',
            status: 'pending',
            createdAt: new Date(),
            studentId: 's-1',
            firstName: 'John',
            lastName: 'Doe',
            admissionNumber: 'A001',
          },
        ],
      );
      await expect(
        service.recordPayment({
          tenantId: 't-1',
          branchId: 'b-1',
          createdBy: 'u-1',
          studentId: 's-1',
          invoiceId: 'inv-1',
          amount: 5000,
          paymentMethod: 'cash',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getCollectionReport ─────────────────────────────────────────────────

  describe('getCollectionReport', () => {
    it('should return collection report', async () => {
      mockDb.setDrizzleResults(
        [{ total: '15000' }],
        [
          { method: 'cash', total: '10000', count: 5 },
          { method: 'upi', total: '5000', count: 3 },
        ],
        [{ count: '10' }],
      );
      const result = await service.getCollectionReport('b-1', {});
      expect(result.totalCollected).toBe(15000);
      expect(result.methodBreakdown).toHaveLength(2);
      expect(result.overdueAccounts).toBe(10);
    });
  });
});
