import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { DatabaseProvider } from '../../database/database.provider';
import { MockDatabaseProvider } from '../../common/test/mocks';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockDb: MockDatabaseProvider;

  beforeEach(async () => {
    mockDb = new MockDatabaseProvider();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: DatabaseProvider, useValue: mockDb },
      ],
    }).compile();
    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    mockDb.clearMocks();
    jest.clearAllMocks();
  });

  const T = { tenantId: 't-1', branchId: 'b-1' };

  // ─── Categories ──────────────────────────────────────────────────────────

  describe('createCategory', () => {
    it('should create a category', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'cat-1' }],
        [
          {
            id: 'cat-1',
            name: 'Stationery',
            branchId: T.branchId,
            deletedAt: null,
          },
        ],
      );
      const result = await service.createCategory({ ...T, name: 'Stationery' });
      expect(result.name).toBe('Stationery');
    });
  });

  describe('findCategoryById', () => {
    it('should return a category', async () => {
      mockDb.setDrizzleResults([
        { id: 'cat-1', name: 'Stationery', deletedAt: null },
      ]);
      const result = await service.findCategoryById('cat-1', T.branchId);
      expect(result.id).toBe('cat-1');
    });

    it('should throw on missing category', async () => {
      mockDb.setDrizzleResults([]);
      await expect(service.findCategoryById('bad', T.branchId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── Items ───────────────────────────────────────────────────────────────

  describe('createItem', () => {
    it('should create an item', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'item-1' }],
        [
          {
            id: 'item-1',
            name: 'Notebook',
            categoryId: 'cat-1',
            currentStock: 0,
          },
        ],
      );
      const result = await service.createItem({
        ...T,
        categoryId: 'cat-1',
        name: 'Notebook',
      });
      expect(result.name).toBe('Notebook');
    });
  });

  describe('findLowStockItems', () => {
    it('should return low stock items', async () => {
      mockDb.setDrizzleResults(
        [
          {
            id: 'item-1',
            name: 'Notebook',
            currentStock: 2,
            reorderLevel: 5,
            deletedAt: null,
          },
        ],
        [{ count: '1' }],
      );
      const result = await service.findLowStockItems(T.branchId, {});
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  // ─── Suppliers ───────────────────────────────────────────────────────────

  describe('createSupplier', () => {
    it('should create a supplier', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'sup-1' }],
        [
          {
            id: 'sup-1',
            name: 'ABC Supplies',
            branchId: T.branchId,
            deletedAt: null,
          },
        ],
      );
      const result = await service.createSupplier({
        ...T,
        name: 'ABC Supplies',
      });
      expect(result.name).toBe('ABC Supplies');
    });
  });

  // ─── Purchase Orders ─────────────────────────────────────────────────────

  describe('createPurchaseOrder', () => {
    it('should create a purchase order with items', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'sup-1' }],
        [{ id: 'po-1' }],
        [],
        [
          {
            id: 'po-1',
            orderNumber: 'PO-123',
            supplierId: 'sup-1',
            status: 'draft',
          },
        ],
      );
      const result = await service.createPurchaseOrder({
        ...T,
        supplierId: 'sup-1',
        createdBy: 'u-1',
        items: [{ itemId: 'item-1', quantity: 10, unitPrice: 5 }],
      });
      expect(result.status).toBe('draft');
    });
  });

  // ─── Goods Receipts ──────────────────────────────────────────────────────

  describe('createGoodsReceipt', () => {
    it('should create a goods receipt and update stock', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'grn-1' }],
        [],
        [],
        [{ id: 'grn-1', receiptNumber: 'GRN-001', status: 'received' }],
        [],
      );
      const result = await service.createGoodsReceipt({
        ...T,
        receiptNumber: 'GRN-001',
        receiptDate: '2026-08-01',
        createdBy: 'u-1',
        items: [{ itemId: 'item-1', quantity: 10 }],
      });
      expect(result.receiptNumber).toBe('GRN-001');
    });
  });

  // ─── Stock Adjustments ───────────────────────────────────────────────────

  describe('createStockAdjustment', () => {
    it('should create an addition adjustment and update stock', async () => {
      mockDb.setDrizzleResults(
        [{ id: 'item-1', currentStock: 10, deletedAt: null }],
        [{ id: 'adj-1' }],
        [],
        [{ id: 'adj-1', adjustmentType: 'addition', quantity: 5 }],
        [{ currentStock: 15 }],
      );
      const result = await service.createStockAdjustment({
        ...T,
        itemId: 'item-1',
        adjustmentType: 'addition',
        quantity: 5,
        adjustedBy: 'u-1',
      });
      expect(result.adjustmentType).toBe('addition');
      expect(result.newStock).toBe(15);
    });

    it('should throw on missing item', async () => {
      mockDb.setDrizzleResults([]);
      await expect(
        service.createStockAdjustment({
          ...T,
          itemId: 'bad',
          adjustmentType: 'addition',
          quantity: 5,
          adjustedBy: 'u-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
