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
import { AccountingService } from './accounting.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { AccountingQueryDto } from './dto/accounting-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // â”€â”€â”€ Chart of Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_accounts', module: 'accounting' })
  @Post('accounts')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Create an account' })
  async createAccount(@CurrentUser() user: any, @Body() dto: CreateAccountDto) {
    const data = await this.accountingService.createAccount({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
    });
    return { success: true, data };
  }

  @Get('accounts')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List accounts' })
  async findAllAccounts(
    @CurrentUser() user: any,
    @Query() query: AccountingQueryDto,
  ) {
    const data = await this.accountingService.findAccountsByBranch(
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('accounts/type/:accountType')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Find accounts by type' })
  async findAccountsByType(
    @CurrentUser() user: any,
    @Param('accountType') accountType: string,
  ) {
    const data = await this.accountingService.findAccountsByType(
      user.branchId,
      accountType,
    );
    return { success: true, data };
  }

  @Get('accounts/:id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Get account by ID' })
  async findAccountById(@Param('id') id: string) {
    const data = await this.accountingService.findAccountById(id);
    return { success: true, data };
  }

  @AuditLog({
    action: 'put_accounts_id',
    module: 'accounting',
    resourceIdParam: 'id',
  })
  @Put('accounts/:id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Update account' })
  async updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    const data = await this.accountingService.updateAccount(id, dto);
    return { success: true, data };
  }

  @AuditLog({
    action: 'delete_accounts_id',
    module: 'accounting',
    resourceIdParam: 'id',
  })
  @Delete('accounts/:id')
  @Roles(ROLES.ORGANIZATION_OWNER, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete account' })
  async deleteAccount(@Param('id') id: string) {
    await this.accountingService.deleteAccount(id);
    return { success: true, message: 'Account deleted' };
  }

  // â”€â”€â”€ Journal Entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @AuditLog({ action: 'post_journal_entries', module: 'accounting' })
  @Post('journal-entries')
  @Roles(ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER)
  @ApiOperation({ summary: 'Create a journal entry' })
  async createJournalEntry(
    @CurrentUser() user: any,
    @Body() dto: CreateJournalEntryDto,
  ) {
    const data = await this.accountingService.createJournalEntry({
      ...dto,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
    });
    return { success: true, data };
  }

  @Get('journal-entries')
  @Roles(ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'List journal entries' })
  async findAllJournalEntries(
    @CurrentUser() user: any,
    @Query() query: AccountingQueryDto,
  ) {
    const data = await this.accountingService.findJournalEntriesByBranch(
      user.branchId,
      query,
    );
    return { success: true, ...data };
  }

  @Get('journal-entries/:id')
  @Roles(ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Get journal entry by ID' })
  async findJournalEntryById(@Param('id') id: string) {
    const data = await this.accountingService.findJournalEntryById(id);
    return { success: true, data };
  }

  // â”€â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('trial-balance')
  @Roles(ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Get trial balance' })
  async getTrialBalance(
    @CurrentUser() user: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const data = await this.accountingService.getTrialBalance(
      user.branchId,
      fromDate,
      toDate,
    );
    return { success: true, data };
  }

  @Get('income-statement')
  @Roles(ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Get income statement' })
  async getIncomeStatement(
    @CurrentUser() user: any,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.accountingService.getIncomeStatement(
      user.branchId,
      fromDate,
      toDate,
    );
    return { success: true, data };
  }

  @Get('balance-sheet')
  @Roles(ROLES.ACCOUNTANT, ROLES.ORGANIZATION_OWNER, ROLES.PRINCIPAL)
  @ApiOperation({ summary: 'Get balance sheet' })
  async getBalanceSheet(
    @CurrentUser() user: any,
    @Query('asOfDate') asOfDate: string,
  ) {
    const data = await this.accountingService.getBalanceSheet(
      user.branchId,
      asOfDate,
    );
    return { success: true, data };
  }
}
