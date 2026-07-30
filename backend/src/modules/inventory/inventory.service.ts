import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, or, ilike, sql } from 'drizzle-orm';

@Injectable()
export class InventoryService {
  constructor(private readonly db: DatabaseProvider) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  async createCategory(params: {
    tenantId: string;
    branchId: string;
    name: string;
    code?: string;
    description?: string;
    parentId?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.inventoryCategories)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        name: params.name,
        code: params.code,
        description: params.description,
        parentId: params.parentId,
      })
      .returning({ id: schema.inventoryCategories.id });

    const [cat] = await this.db.db
      .select()
      .from(schema.inventoryCategories)
      .where(eq(schema.inventoryCategories.id, inserted.id))
      .limit(1);
    return cat;
  }

  async findCategoriesByBranch(branchId: string) {
    return this.db.db
      .select()
      .from(schema.inventoryCategories)
      .where(
        and(
          eq(schema.inventoryCategories.branchId, branchId),
          sql`${schema.inventoryCategories.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(schema.inventoryCategories.createdAt));
  }

  async findCategoryById(id: string, branchId: string) {
    const conditions: any[] = [
      eq(schema.inventoryCategories.id, id),
      eq(schema.inventoryCategories.branchId, branchId),
      sql`${schema.inventoryCategories.deletedAt} IS NULL`,
    ];
    const [result] = await this.db.db
      .select()
      .from(schema.inventoryCategories)
      .where(and(...conditions))
      .limit(1);
    if (!result) throw new NotFoundException('Category not found');
    return result;
  }

  async updateCategory(id: string, branchId: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.inventoryCategories.id })
      .from(schema.inventoryCategories)
      .where(
        and(
          eq(schema.inventoryCategories.id, id),
          eq(schema.inventoryCategories.branchId, branchId),
          sql`${schema.inventoryCategories.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Category not found');

    await this.db.db
      .update(schema.inventoryCategories)
      .set({ ...params, updatedAt: new Date() })
      .where(eq(schema.inventoryCategories.id, id));
    const [cat] = await this.db.db
      .select()
      .from(schema.inventoryCategories)
      .where(eq(schema.inventoryCategories.id, id))
      .limit(1);
    return cat;
  }

  async deleteCategory(id: string, branchId: string) {
    const [existing] = await this.db.db
      .select({ id: schema.inventoryCategories.id })
      .from(schema.inventoryCategories)
      .where(
        and(
          eq(schema.inventoryCategories.id, id),
          eq(schema.inventoryCategories.branchId, branchId),
          sql`${schema.inventoryCategories.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Category not found');
    await this.db.db
      .update(schema.inventoryCategories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.inventoryCategories.id, id));
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ITEMS
  // ═══════════════════════════════════════════════════════════════════════════

  async createItem(params: {
    tenantId: string;
    branchId: string;
    categoryId: string;
    name: string;
    code?: string;
    unit?: string;
    reorderLevel?: number;
    currentStock?: number;
    unitPrice?: number;
    taxRate?: number;
    description?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.inventoryItems)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        categoryId: params.categoryId,
        name: params.name,
        code: params.code,
        unit: params.unit,
        reorderLevel: params.reorderLevel ?? 0,
        currentStock: params.currentStock ?? 0,
        unitPrice:
          params.unitPrice !== undefined ? String(params.unitPrice) : undefined,
        taxRate: params.taxRate !== undefined ? String(params.taxRate) : '0',
        description: params.description,
      })
      .returning({ id: schema.inventoryItems.id });

    const [item] = await this.db.db
      .select()
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, inserted.id))
      .limit(1);
    return item;
  }

  async findItemsByBranch(
    branchId: string,
    query: {
      page?: number;
      limit?: number;
      categoryId?: string;
      search?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.inventoryItems.branchId, branchId),
      sql`${schema.inventoryItems.deletedAt} IS NULL`,
    ];

    if (query.categoryId)
      conditions.push(eq(schema.inventoryItems.categoryId, query.categoryId));
    if (query.search) {
      conditions.push(
        or(
          ilike(schema.inventoryItems.name, `%${query.search}%`),
          ilike(schema.inventoryItems.code, `%${query.search}%`),
        ),
      );
    }

    const data = await this.db.db
      .select()
      .from(schema.inventoryItems)
      .where(and(...conditions))
      .orderBy(desc(schema.inventoryItems.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.inventoryItems)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findItemById(id: string, branchId: string) {
    const conditions: any[] = [
      eq(schema.inventoryItems.id, id),
      eq(schema.inventoryItems.branchId, branchId),
      sql`${schema.inventoryItems.deletedAt} IS NULL`,
    ];
    const [result] = await this.db.db
      .select()
      .from(schema.inventoryItems)
      .where(and(...conditions))
      .limit(1);
    if (!result) throw new NotFoundException('Item not found');
    return result;
  }

  async updateItem(id: string, branchId: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.inventoryItems.id })
      .from(schema.inventoryItems)
      .where(
        and(
          eq(schema.inventoryItems.id, id),
          eq(schema.inventoryItems.branchId, branchId),
          sql`${schema.inventoryItems.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Item not found');

    const updateData: any = { ...params, updatedAt: new Date() };
    if (params.unitPrice !== undefined)
      updateData.unitPrice = String(params.unitPrice);
    if (params.taxRate !== undefined)
      updateData.taxRate = String(params.taxRate);

    await this.db.db
      .update(schema.inventoryItems)
      .set(updateData)
      .where(eq(schema.inventoryItems.id, id));
    const [item] = await this.db.db
      .select()
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, id))
      .limit(1);
    return item;
  }

  async deleteItem(id: string, branchId: string) {
    const [existing] = await this.db.db
      .select({ id: schema.inventoryItems.id })
      .from(schema.inventoryItems)
      .where(
        and(
          eq(schema.inventoryItems.id, id),
          eq(schema.inventoryItems.branchId, branchId),
          sql`${schema.inventoryItems.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Item not found');
    await this.db.db
      .update(schema.inventoryItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.inventoryItems.id, id));
    return { success: true };
  }

  async findLowStockItems(
    branchId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.inventoryItems.branchId, branchId),
      sql`${schema.inventoryItems.deletedAt} IS NULL`,
      sql`${schema.inventoryItems.currentStock} <= ${schema.inventoryItems.reorderLevel}`,
    ];

    const data = await this.db.db
      .select()
      .from(schema.inventoryItems)
      .where(and(...conditions))
      .orderBy(desc(schema.inventoryItems.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.inventoryItems)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  async createSupplier(params: {
    tenantId: string;
    branchId: string;
    name: string;
    code?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
  }) {
    const [inserted] = await this.db.db
      .insert(schema.inventorySuppliers)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        name: params.name,
        code: params.code,
        contactPerson: params.contactPerson,
        phone: params.phone,
        email: params.email,
        address: params.address,
      })
      .returning({ id: schema.inventorySuppliers.id });

    const [supplier] = await this.db.db
      .select()
      .from(schema.inventorySuppliers)
      .where(eq(schema.inventorySuppliers.id, inserted.id))
      .limit(1);
    return supplier;
  }

  async findSuppliersByBranch(branchId: string) {
    return this.db.db
      .select()
      .from(schema.inventorySuppliers)
      .where(
        and(
          eq(schema.inventorySuppliers.branchId, branchId),
          sql`${schema.inventorySuppliers.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(schema.inventorySuppliers.createdAt));
  }

  async findSupplierById(id: string, branchId: string) {
    const conditions: any[] = [
      eq(schema.inventorySuppliers.id, id),
      eq(schema.inventorySuppliers.branchId, branchId),
      sql`${schema.inventorySuppliers.deletedAt} IS NULL`,
    ];
    const [result] = await this.db.db
      .select()
      .from(schema.inventorySuppliers)
      .where(and(...conditions))
      .limit(1);
    if (!result) throw new NotFoundException('Supplier not found');
    return result;
  }

  async updateSupplier(id: string, branchId: string, params: any) {
    const [existing] = await this.db.db
      .select({ id: schema.inventorySuppliers.id })
      .from(schema.inventorySuppliers)
      .where(
        and(
          eq(schema.inventorySuppliers.id, id),
          eq(schema.inventorySuppliers.branchId, branchId),
          sql`${schema.inventorySuppliers.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Supplier not found');

    await this.db.db
      .update(schema.inventorySuppliers)
      .set({ ...params, updatedAt: new Date() })
      .where(eq(schema.inventorySuppliers.id, id));
    const [supplier] = await this.db.db
      .select()
      .from(schema.inventorySuppliers)
      .where(eq(schema.inventorySuppliers.id, id))
      .limit(1);
    return supplier;
  }

  async deleteSupplier(id: string, branchId: string) {
    const [existing] = await this.db.db
      .select({ id: schema.inventorySuppliers.id })
      .from(schema.inventorySuppliers)
      .where(
        and(
          eq(schema.inventorySuppliers.id, id),
          eq(schema.inventorySuppliers.branchId, branchId),
          sql`${schema.inventorySuppliers.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Supplier not found');
    await this.db.db
      .update(schema.inventorySuppliers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.inventorySuppliers.id, id));
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PURCHASE ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  async createPurchaseOrder(params: {
    tenantId: string;
    branchId: string;
    supplierId: string;
    orderDate?: string;
    expectedDate?: string;
    notes?: string;
    items?: { itemId: string; quantity: number; unitPrice: number }[];
    createdBy: string;
  }) {
    const [existing] = await this.db.db
      .select({ id: schema.inventorySuppliers.id })
      .from(schema.inventorySuppliers)
      .where(eq(schema.inventorySuppliers.id, params.supplierId))
      .limit(1);
    if (!existing) throw new NotFoundException('Supplier not found');

    const orderNumber = `PO-${Date.now()}`;
    const orderDate =
      params.orderDate || new Date().toISOString().split('T')[0];

    const items = params.items || [];
    const totalAmount = items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );

    const [inserted] = await this.db.db
      .insert(schema.inventoryPurchaseOrders)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        orderNumber,
        supplierId: params.supplierId,
        orderDate,
        expectedDate: params.expectedDate,
        totalAmount: String(totalAmount),
        notes: params.notes,
        createdBy: params.createdBy,
      })
      .returning({ id: schema.inventoryPurchaseOrders.id });

    if (items.length > 0) {
      await this.db.db.insert(schema.inventoryPurchaseOrderItems).values(
        items.map((i) => ({
          poId: inserted.id,
          itemId: i.itemId,
          quantity: i.quantity,
          unitPrice: String(i.unitPrice),
          totalPrice: String(i.quantity * i.unitPrice),
        })),
      );
    }

    const [po] = await this.db.db
      .select()
      .from(schema.inventoryPurchaseOrders)
      .where(eq(schema.inventoryPurchaseOrders.id, inserted.id))
      .limit(1);
    const poItems = await this.db.db
      .select()
      .from(schema.inventoryPurchaseOrderItems)
      .where(eq(schema.inventoryPurchaseOrderItems.poId, inserted.id));
    return { ...po, items: poItems };
  }

  async addPoItem(
    poId: string,
    branchId: string,
    params: { itemId: string; quantity: number; unitPrice: number },
  ) {
    const [po] = await this.db.db
      .select({
        id: schema.inventoryPurchaseOrders.id,
        branchId: schema.inventoryPurchaseOrders.branchId,
      })
      .from(schema.inventoryPurchaseOrders)
      .where(eq(schema.inventoryPurchaseOrders.id, poId))
      .limit(1);
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.branchId !== branchId)
      throw new NotFoundException('Purchase order not found');

    const totalPrice = params.quantity * params.unitPrice;
    const [inserted] = await this.db.db
      .insert(schema.inventoryPurchaseOrderItems)
      .values({
        poId,
        itemId: params.itemId,
        quantity: params.quantity,
        unitPrice: String(params.unitPrice),
        totalPrice: String(totalPrice),
      })
      .returning({ id: schema.inventoryPurchaseOrderItems.id });

    const [poItem] = await this.db.db
      .select()
      .from(schema.inventoryPurchaseOrderItems)
      .where(eq(schema.inventoryPurchaseOrderItems.id, inserted.id))
      .limit(1);

    const allItems = await this.db.db
      .select()
      .from(schema.inventoryPurchaseOrderItems)
      .where(eq(schema.inventoryPurchaseOrderItems.poId, poId));
    const newTotal = allItems.reduce(
      (sum, i) => sum + Number(i.totalPrice || 0),
      0,
    );
    await this.db.db
      .update(schema.inventoryPurchaseOrders)
      .set({ totalAmount: String(newTotal), updatedAt: new Date() })
      .where(eq(schema.inventoryPurchaseOrders.id, poId));

    return poItem;
  }

  async findPurchaseOrdersByBranch(
    branchId: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.inventoryPurchaseOrders.branchId, branchId),
      sql`${schema.inventoryPurchaseOrders.deletedAt} IS NULL`,
    ];
    if (query.status)
      conditions.push(eq(schema.inventoryPurchaseOrders.status, query.status));

    const data = await this.db.db
      .select()
      .from(schema.inventoryPurchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(schema.inventoryPurchaseOrders.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.inventoryPurchaseOrders)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findPurchaseOrderById(id: string, branchId: string) {
    const conditions: any[] = [
      eq(schema.inventoryPurchaseOrders.id, id),
      eq(schema.inventoryPurchaseOrders.branchId, branchId),
      sql`${schema.inventoryPurchaseOrders.deletedAt} IS NULL`,
    ];
    const [po] = await this.db.db
      .select()
      .from(schema.inventoryPurchaseOrders)
      .where(and(...conditions))
      .limit(1);
    if (!po) throw new NotFoundException('Purchase order not found');

    const items = await this.db.db
      .select()
      .from(schema.inventoryPurchaseOrderItems)
      .where(eq(schema.inventoryPurchaseOrderItems.poId, id));
    return { ...po, items };
  }

  async updatePurchaseOrderStatus(
    id: string,
    branchId: string,
    status: string,
  ) {
    const [existing] = await this.db.db
      .select({ id: schema.inventoryPurchaseOrders.id })
      .from(schema.inventoryPurchaseOrders)
      .where(
        and(
          eq(schema.inventoryPurchaseOrders.id, id),
          eq(schema.inventoryPurchaseOrders.branchId, branchId),
          sql`${schema.inventoryPurchaseOrders.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException('Purchase order not found');

    await this.db.db
      .update(schema.inventoryPurchaseOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.inventoryPurchaseOrders.id, id));
    const [po] = await this.db.db
      .select()
      .from(schema.inventoryPurchaseOrders)
      .where(eq(schema.inventoryPurchaseOrders.id, id))
      .limit(1);
    return po;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GOODS RECEIPTS
  // ═══════════════════════════════════════════════════════════════════════════

  async createGoodsReceipt(params: {
    tenantId: string;
    branchId: string;
    poId?: string;
    receiptNumber: string;
    receiptDate: string;
    notes?: string;
    createdBy: string;
    items?: { itemId: string; quantity: number; unitPrice?: number }[];
  }) {
    const [inserted] = await this.db.db
      .insert(schema.inventoryGoodsReceipts)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        poId: params.poId,
        receiptNumber: params.receiptNumber,
        receiptDate: params.receiptDate,
        notes: params.notes,
        createdBy: params.createdBy,
      })
      .returning({ id: schema.inventoryGoodsReceipts.id });

    const items = params.items || [];
    if (items.length > 0) {
      await this.db.db.insert(schema.inventoryGoodsReceiptItems).values(
        items.map((i) => ({
          grnId: inserted.id,
          itemId: i.itemId,
          quantity: i.quantity,
          unitPrice:
            i.unitPrice !== undefined ? String(i.unitPrice) : undefined,
        })),
      );

      for (const item of items) {
        await this.db.db
          .update(schema.inventoryItems)
          .set({
            currentStock: sql`${schema.inventoryItems.currentStock} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.inventoryItems.id, item.itemId),
              eq(schema.inventoryItems.branchId, params.branchId),
            ),
          );
      }
    }

    if (params.poId) {
      await this.db.db
        .update(schema.inventoryPurchaseOrders)
        .set({ status: 'received', updatedAt: new Date() })
        .where(eq(schema.inventoryPurchaseOrders.id, params.poId));
    }

    const [grn] = await this.db.db
      .select()
      .from(schema.inventoryGoodsReceipts)
      .where(eq(schema.inventoryGoodsReceipts.id, inserted.id))
      .limit(1);
    const grnItems = await this.db.db
      .select()
      .from(schema.inventoryGoodsReceiptItems)
      .where(eq(schema.inventoryGoodsReceiptItems.grnId, inserted.id));
    return { ...grn, items: grnItems };
  }

  async findGoodsReceiptsByBranch(
    branchId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.inventoryGoodsReceipts.branchId, branchId),
    ];

    const data = await this.db.db
      .select()
      .from(schema.inventoryGoodsReceipts)
      .where(and(...conditions))
      .orderBy(desc(schema.inventoryGoodsReceipts.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.inventoryGoodsReceipts)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findGoodsReceiptById(id: string, branchId: string) {
    const conditions: any[] = [
      eq(schema.inventoryGoodsReceipts.id, id),
      eq(schema.inventoryGoodsReceipts.branchId, branchId),
    ];
    const [grn] = await this.db.db
      .select()
      .from(schema.inventoryGoodsReceipts)
      .where(and(...conditions))
      .limit(1);
    if (!grn) throw new NotFoundException('Goods receipt not found');

    const items = await this.db.db
      .select()
      .from(schema.inventoryGoodsReceiptItems)
      .where(eq(schema.inventoryGoodsReceiptItems.grnId, id));
    return { ...grn, items };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STOCK ADJUSTMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  async createStockAdjustment(params: {
    tenantId: string;
    branchId: string;
    itemId: string;
    adjustmentType: string;
    quantity: number;
    reason?: string;
    referenceNumber?: string;
    adjustedBy: string;
    notes?: string;
  }) {
    const [item] = await this.db.db
      .select({
        id: schema.inventoryItems.id,
        currentStock: schema.inventoryItems.currentStock,
      })
      .from(schema.inventoryItems)
      .where(
        and(
          eq(schema.inventoryItems.id, params.itemId),
          eq(schema.inventoryItems.branchId, params.branchId),
          sql`${schema.inventoryItems.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!item) throw new NotFoundException('Item not found');

    const adjustmentQty =
      params.adjustmentType === 'addition' ? params.quantity : -params.quantity;

    const [inserted] = await this.db.db
      .insert(schema.inventoryStockAdjustments)
      .values({
        tenantId: params.tenantId,
        branchId: params.branchId,
        itemId: params.itemId,
        adjustmentType: params.adjustmentType,
        quantity: params.quantity,
        reason: params.reason,
        referenceNumber: params.referenceNumber,
        adjustedBy: params.adjustedBy,
        notes: params.notes,
      })
      .returning({ id: schema.inventoryStockAdjustments.id });

    await this.db.db
      .update(schema.inventoryItems)
      .set({
        currentStock: sql`${schema.inventoryItems.currentStock} + ${adjustmentQty}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.inventoryItems.id, params.itemId));

    const [adj] = await this.db.db
      .select()
      .from(schema.inventoryStockAdjustments)
      .where(eq(schema.inventoryStockAdjustments.id, inserted.id))
      .limit(1);
    const [updatedItem] = await this.db.db
      .select({ currentStock: schema.inventoryItems.currentStock })
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, params.itemId))
      .limit(1);
    return { ...adj, newStock: Number(updatedItem.currentStock) };
  }

  async findStockAdjustmentsByBranch(
    branchId: string,
    query: { page?: number; limit?: number; itemId?: string },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.inventoryStockAdjustments.branchId, branchId),
    ];
    if (query.itemId)
      conditions.push(
        eq(schema.inventoryStockAdjustments.itemId, query.itemId),
      );

    const data = await this.db.db
      .select()
      .from(schema.inventoryStockAdjustments)
      .where(and(...conditions))
      .orderBy(desc(schema.inventoryStockAdjustments.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.inventoryStockAdjustments)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }
}
