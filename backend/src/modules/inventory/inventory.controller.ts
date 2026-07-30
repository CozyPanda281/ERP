import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { AddPoItemDto } from './dto/add-po-item.dto';
import { CreateGrnDto } from './dto/create-grn.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  // ─── Categories ──────────────────────────────────────────────────────────

  @Post('categories')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create inventory category' })
  async createCategory(
    @Body() body: CreateCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createCategory({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
  }

  @Get('categories')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List categories by branch' })
  async getCategories(@CurrentUser() user: any) {
    return this.service.findCategoriesByBranch(user.branchId);
  }

  @Get('categories/:id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get category by ID' })
  async getCategoryById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findCategoryById(id, user.branchId);
  }

  @Put('categories/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateCategory(id, user.branchId, body);
  }

  @Delete('categories/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteCategory(id, user.branchId);
  }

  // ─── Items ───────────────────────────────────────────────────────────────

  @Post('items')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create inventory item' })
  async createItem(@Body() body: CreateItemDto, @CurrentUser() user: any) {
    return this.service.createItem({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
  }

  @Get('items')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List items by branch' })
  async getItems(@CurrentUser() user: any, @Query() query: InventoryQueryDto) {
    return this.service.findItemsByBranch(user.branchId, query);
  }

  @Get('items/low-stock')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List low stock items' })
  async getLowStockItems(
    @CurrentUser() user: any,
    @Query() query: InventoryQueryDto,
  ) {
    return this.service.findLowStockItems(user.branchId, query);
  }

  @Get('items/:id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get item by ID' })
  async getItemById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findItemById(id, user.branchId);
  }

  @Put('items/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update item' })
  async updateItem(
    @Param('id') id: string,
    @Body() body: UpdateItemDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateItem(id, user.branchId, body);
  }

  @Delete('items/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete item' })
  async deleteItem(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteItem(id, user.branchId);
  }

  // ─── Suppliers ───────────────────────────────────────────────────────────

  @Post('suppliers')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create supplier' })
  async createSupplier(
    @Body() body: CreateSupplierDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createSupplier({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
  }

  @Get('suppliers')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List suppliers' })
  async getSuppliers(@CurrentUser() user: any) {
    return this.service.findSuppliersByBranch(user.branchId);
  }

  @Get('suppliers/:id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get supplier by ID' })
  async getSupplierById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findSupplierById(id, user.branchId);
  }

  @Put('suppliers/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update supplier' })
  async updateSupplier(
    @Param('id') id: string,
    @Body() body: CreateSupplierDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateSupplier(id, user.branchId, body);
  }

  @Delete('suppliers/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete supplier' })
  async deleteSupplier(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteSupplier(id, user.branchId);
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────

  @Post('purchase-orders')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create purchase order' })
  async createPurchaseOrder(
    @Body() body: CreatePurchaseOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createPurchaseOrder({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
    });
  }

  @Get('purchase-orders')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List purchase orders' })
  async getPurchaseOrders(
    @CurrentUser() user: any,
    @Query() query: InventoryQueryDto,
  ) {
    return this.service.findPurchaseOrdersByBranch(user.branchId, query);
  }

  @Get('purchase-orders/:id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get purchase order by ID' })
  async getPurchaseOrderById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findPurchaseOrderById(id, user.branchId);
  }

  @Put('purchase-orders/:id/status')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update purchase order status' })
  async updatePurchaseOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: any,
  ) {
    return this.service.updatePurchaseOrderStatus(id, user.branchId, status);
  }

  @Post('purchase-orders/:id/items')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Add item to purchase order' })
  async addPoItem(
    @Param('id') id: string,
    @Body() body: AddPoItemDto,
    @CurrentUser() user: any,
  ) {
    return this.service.addPoItem(id, user.branchId, body);
  }

  // ─── Goods Receipts ──────────────────────────────────────────────────────

  @Post('goods-receipts')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create goods receipt' })
  async createGoodsReceipt(
    @Body()
    body: CreateGrnDto & {
      items?: { itemId: string; quantity: number; unitPrice?: number }[];
    },
    @CurrentUser() user: any,
  ) {
    return this.service.createGoodsReceipt({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
    });
  }

  @Get('goods-receipts')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List goods receipts' })
  async getGoodsReceipts(
    @CurrentUser() user: any,
    @Query() query: InventoryQueryDto,
  ) {
    return this.service.findGoodsReceiptsByBranch(user.branchId, query);
  }

  @Get('goods-receipts/:id')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get goods receipt by ID' })
  async getGoodsReceiptById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findGoodsReceiptById(id, user.branchId);
  }

  // ─── Stock Adjustments ───────────────────────────────────────────────────

  @Post('stock-adjustments')
  @Roles(ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create stock adjustment' })
  async createStockAdjustment(
    @Body() body: StockAdjustmentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createStockAdjustment({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      adjustedBy: user.id,
    });
  }

  @Get('stock-adjustments')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.PRINCIPAL,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List stock adjustments' })
  async getStockAdjustments(
    @CurrentUser() user: any,
    @Query() query: InventoryQueryDto,
  ) {
    return this.service.findStockAdjustmentsByBranch(user.branchId, query);
  }
}
