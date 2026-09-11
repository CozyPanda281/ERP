import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeeService } from './fee.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { AssignFeeStructureDto } from './dto/assign-fee-structure.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { AddFeeItemDto } from './dto/add-fee-item.dto';
import { UpdateFeeItemDto } from './dto/update-fee-item.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { FeeQueryDto, PaymentQueryDto } from './dto/fee-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Fee')
@ApiBearerAuth()
@Controller()
export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  // â”€â”€â”€ Fee Structures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_fee_structures', module: 'fee' })
  @Post('fee-structures')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Create fee structure with items' })
  async createStructure(
    @CurrentUser() user: any,
    @Body() dto: CreateFeeStructureDto,
  ) {
    const data = await this.feeService.createStructure({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('fee-structures')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List fee structures' })
  async findStructures(@CurrentUser() user: any, @Query() query: FeeQueryDto) {
    const data = await this.feeService.findStructuresByBranch(
      user.tenantId,
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('fee-structures/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get fee structure with items' })
  async findStructure(@Param('id') id: string) {
    const data = await this.feeService.findStructureById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_fee_structures_id',
    module: 'fee',
    resourceIdParam: 'id',
  })
  @Put('fee-structures/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Update fee structure' })
  async updateStructure(
    @Param('id') id: string,
    @Body() dto: UpdateFeeStructureDto,
  ) {
    const data = await this.feeService.updateStructure(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_fee_structures_id',
    module: 'fee',
    resourceIdParam: 'id',
  })
  @Delete('fee-structures/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete fee structure' })
  async deleteStructure(@Param('id') id: string, @CurrentUser() user: any) {
    await this.feeService.deleteStructure(id, user.branchId);
    return { success: true, message: 'Fee structure deleted' };
  }

  // â”€â”€â”€ Fee Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({
    action: 'post_fee_structures_structureId_items',
    module: 'fee',
    resourceIdParam: 'id',
  })
  @Post('fee-structures/:structureId/items')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Add item to fee structure' })
  async addItem(
    @Param('structureId') structureId: string,
    @Body() dto: AddFeeItemDto,
  ) {
    const data = await this.feeService.addItem(structureId, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_fee_items_id',
    module: 'fee',
    resourceIdParam: 'id',
  })
  @Put('fee-items/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update fee item' })
  async updateItem(@Param('id') id: string, @Body() dto: UpdateFeeItemDto) {
    const data = await this.feeService.updateItem(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_fee_items_id',
    module: 'fee',
    resourceIdParam: 'id',
  })
  @Delete('fee-items/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Remove fee item' })
  async removeItem(@Param('id') id: string) {
    await this.feeService.removeItem(id);
    return { success: true, message: 'Fee item removed' };
  }

  // â”€â”€â”€ Discounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_fee_discounts', module: 'fee' })
  @Post('fee-discounts')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create discount' })
  async createDiscount(
    @CurrentUser() user: any,
    @Body() dto: CreateDiscountDto,
  ) {
    const data = await this.feeService.createDiscount({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('fee-discounts')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List discounts' })
  async findDiscounts(@CurrentUser() user: any) {
    const data = await this.feeService.findDiscountsByBranch(
      user.tenantId,
      user.branchId,
    );
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_fee_discounts_id',
    module: 'fee',
    resourceIdParam: 'id',
  })
  @Put('fee-discounts/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Update discount' })
  async updateDiscount(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateDiscountDto,
  ) {
    const data = await this.feeService.updateDiscount(id, user.branchId, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_fee_discounts_id',
    module: 'fee',
    resourceIdParam: 'id',
  })
  @Delete('fee-discounts/:id')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Delete discount' })
  async deleteDiscount(@Param('id') id: string, @CurrentUser() user: any) {
    await this.feeService.deleteDiscount(id, user.branchId);
    return { success: true, message: 'Discount deleted' };
  }

  // â”€â”€â”€ Student Fee Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_fee_accounts_assign', module: 'fee' })
  @Post('fee-accounts/assign')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Assign fee structure to students' })
  async assignFeeStructure(
    @CurrentUser() user: any,
    @Body() dto: AssignFeeStructureDto,
  ) {
    const data = await this.feeService.assignFeeStructure({
      tenantId: user.tenantId,
      branchId: user.branchId,
      feeStructureId: dto.feeStructureId,
      academicYearId: dto.academicYearId,
      studentIds: dto.studentIds,
    });
    return { success: true, data };
  }

  @Get('fee-accounts')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List fee accounts' })
  async findAccounts(@CurrentUser() user: any, @Query() query: FeeQueryDto) {
    const data = await this.feeService.findAccountsByBranch(
      user.tenantId,
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('fee-accounts/student/:studentId')
  @Roles(
    ROLES.PRINCIPAL,
    ROLES.ACCOUNTANT,
    ROLES.STUDENT,
    ROLES.ORGANIZATION_OWNER,
  )
  @ApiOperation({ summary: 'Get fee account for a student' })
  async findAccountByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.feeService.findAccountByStudent(
      studentId,
      user.tenantId,
      user.branchId,
    );
    return { success: true, data };
  }

  // â”€â”€â”€ Invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_fee_invoices_generate', module: 'fee' })
  @Post('fee-invoices/generate')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Generate invoice for a student' })
  async generateInvoice(
    @CurrentUser() user: any,
    @Body() dto: GenerateInvoiceDto,
  ) {
    const data = await this.feeService.generateInvoice({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('fee-invoices')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List invoices' })
  async findInvoices(@CurrentUser() user: any, @Query() query: FeeQueryDto) {
    const data = await this.feeService.findInvoicesByBranch(
      user.tenantId,
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('fee-invoices/student/:studentId')
  @Roles(
    ROLES.PRINCIPAL,
    ROLES.ACCOUNTANT,
    ROLES.STUDENT,
    ROLES.ORGANIZATION_OWNER,
  )
  @ApiOperation({ summary: 'Get invoices for a student' })
  async findInvoicesByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query() query: FeeQueryDto,
  ) {
    const data = await this.feeService.findInvoicesByStudent(
      studentId,
      user.tenantId,
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('fee-invoices/:id')
  @Roles(
    ROLES.PRINCIPAL,
    ROLES.ACCOUNTANT,
    ROLES.STUDENT,
    ROLES.ORGANIZATION_OWNER,
  )
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findInvoice(@Param('id') id: string) {
    const data = await this.feeService.findInvoiceById(id);
    return { success: true, data };
  }

  // â”€â”€â”€ Payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_fee_payments', module: 'fee' })
  @Post('fee-payments')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Record a payment' })
  async recordPayment(@CurrentUser() user: any, @Body() dto: RecordPaymentDto) {
    const data = await this.feeService.recordPayment({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
    });
    return { success: true, data };
  }

  @Get('fee-payments')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'List payments' })
  async findPayments(
    @CurrentUser() user: any,
    @Query() query: PaymentQueryDto,
  ) {
    const data = await this.feeService.findPaymentsByBranch(
      user.tenantId,
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('fee-payments/student/:studentId')
  @Roles(
    ROLES.PRINCIPAL,
    ROLES.ACCOUNTANT,
    ROLES.STUDENT,
    ROLES.ORGANIZATION_OWNER,
  )
  @ApiOperation({ summary: 'Get payments for a student' })
  async findPaymentsByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query() query: PaymentQueryDto,
  ) {
    const data = await this.feeService.findPaymentsByStudent(
      studentId,
      user.tenantId,
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('fee-payments/:transactionId/receipt')
  @Roles(
    ROLES.PRINCIPAL,
    ROLES.ACCOUNTANT,
    ROLES.STUDENT,
    ROLES.ORGANIZATION_OWNER,
  )
  @ApiOperation({ summary: 'Get receipt for a transaction' })
  async findReceipt(@Param('transactionId') transactionId: string) {
    const data = await this.feeService.findReceiptByTransaction(transactionId);
    return { success: true, data };
  }

  // â”€â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('fee-reports/collection')
  @Roles(ROLES.PRINCIPAL, ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Get fee collection report' })
  async getCollectionReport(
    @CurrentUser() user: any,
    @Query() query: FeeQueryDto,
  ) {
    const data = await this.feeService.getCollectionReport(
      user.branchId,
      query,
    );
    return { success: true, data };
  }
}
