import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES } from '../../common/constants';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { CreateIncomeCategoryDto } from './dto/create-income-category.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateIncomeDto } from './dto/create-income.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @AuditLog({ action: 'post_expense_categories', module: 'expenses' })
  @Post('expense-categories')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Create expense category' })
  async createExpenseCategory(
    @Body() body: CreateExpenseCategoryDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createExpenseCategory({
      ...body,
      tenantId: user.tenantId,
    });
    return { success: true, data };
  }

  @Get('expense-categories')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'List expense categories' })
  async getExpenseCategories(@CurrentUser() user: any) {
    const data = await this.service.findExpenseCategoriesByTenant(
      user.tenantId,
    );
    return { success: true, data };
  }

  @AuditLog({ action: 'post_income_categories', module: 'expenses' })
  @Post('income-categories')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Create income category' })
  async createIncomeCategory(
    @Body() body: CreateIncomeCategoryDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createIncomeCategory({
      ...body,
      tenantId: user.tenantId,
    });
    return { success: true, data };
  }

  @Get('income-categories')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'List income categories' })
  async getIncomeCategories(@CurrentUser() user: any) {
    const data = await this.service.findIncomeCategoriesByTenant(user.tenantId);
    return { success: true, data };
  }

  @AuditLog({ action: 'post_root', module: 'expenses' })
  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Record expense' })
  async createExpense(
    @Body() body: CreateExpenseDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createExpense({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
    });
    return { success: true, data };
  }

  @Get()
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
    ROLES.PRINCIPAL,
  )
  @ApiOperation({ summary: 'List expenses' })
  async getExpenses(@CurrentUser() user: any, @Query() query: ExpenseQueryDto) {
    const data = await this.service.findExpensesByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @AuditLog({ action: 'post_income', module: 'expenses' })
  @Post('income')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Record income' })
  async createIncome(@Body() body: CreateIncomeDto, @CurrentUser() user: any) {
    const data = await this.service.createIncome({
      ...body,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdBy: user.id,
    });
    return { success: true, data };
  }

  @Get('income')
  @Roles(
    ROLES.SUPER_ADMIN,
    ROLES.ORGANIZATION_OWNER,
    ROLES.ACCOUNTANT,
    ROLES.PRINCIPAL,
  )
  @ApiOperation({ summary: 'List income records' })
  async getIncome(@CurrentUser() user: any, @Query() query: ExpenseQueryDto) {
    const data = await this.service.findIncomeByBranch(user.branchId, query);
    return { success: true, ...data };
  }

  @Get('income/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Get income by ID' })
  async getIncomeById(@Param('id') id: string) {
    const data = await this.service.findIncomeById(id);
    return { success: true, data };
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.ORGANIZATION_OWNER, ROLES.ACCOUNTANT)
  @ApiOperation({ summary: 'Get expense by ID' })
  async getExpenseById(@Param('id') id: string) {
    const data = await this.service.findExpenseById(id);
    return { success: true, data };
  }
}
