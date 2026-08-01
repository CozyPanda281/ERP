import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, desc, count, sql, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AccountingService {
  constructor(private readonly db: DatabaseProvider) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNTS (Chart of Accounts)
  // ═══════════════════════════════════════════════════════════════════════════

  async createAccount(params: {
    tenantId: string;
    branchId: string;
    accountCode: string;
    accountName: string;
    accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
    parentId?: string;
    description?: string;
    openingBalance?: number;
  }) {
    const [existing] = await this.db.db
      .select({ id: schema.accountingAccounts.id })
      .from(schema.accountingAccounts)
      .where(
        and(
          eq(schema.accountingAccounts.tenantId, params.tenantId),
          eq(schema.accountingAccounts.branchId, params.branchId),
          eq(schema.accountingAccounts.accountCode, params.accountCode),
          isNull(schema.accountingAccounts.deletedAt),
        ),
      )
      .limit(1);
    if (existing)
      throw new BadRequestException(
        'Account code already exists for this branch',
      );

    const id = uuidv4();
    await this.db.db.insert(schema.accountingAccounts).values({
      id,
      tenantId: params.tenantId,
      branchId: params.branchId,
      accountCode: params.accountCode,
      accountName: params.accountName,
      accountType: params.accountType,
      parentId: params.parentId,
      description: params.description,
      openingBalance:
        params.openingBalance !== undefined
          ? String(params.openingBalance)
          : '0',
    });

    return this.findAccountById(id);
  }

  async findAccountById(id: string) {
    const [result] = await this.db.db
      .select()
      .from(schema.accountingAccounts)
      .where(
        and(
          eq(schema.accountingAccounts.id, id),
          isNull(schema.accountingAccounts.deletedAt),
        ),
      )
      .limit(1);
    if (!result) throw new NotFoundException('Account not found');
    return result;
  }

  async findAccountsByBranch(
    branchId: string,
    query?: { page?: number; limit?: number; accountType?: string },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 100, 200);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.accountingAccounts.branchId, branchId),
      isNull(schema.accountingAccounts.deletedAt),
    ];
    if (query?.accountType)
      conditions.push(
        eq(schema.accountingAccounts.accountType, query.accountType),
      );

    const data = await this.db.db
      .select()
      .from(schema.accountingAccounts)
      .where(and(...conditions))
      .orderBy(schema.accountingAccounts.accountCode)
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.accountingAccounts)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async findAccountsByType(branchId: string, accountType: string) {
    return this.db.db
      .select()
      .from(schema.accountingAccounts)
      .where(
        and(
          eq(schema.accountingAccounts.branchId, branchId),
          eq(schema.accountingAccounts.accountType, accountType),
          isNull(schema.accountingAccounts.deletedAt),
        ),
      )
      .orderBy(schema.accountingAccounts.accountCode);
  }

  async updateAccount(
    id: string,
    params: {
      accountCode?: string;
      accountName?: string;
      accountType?: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
      parentId?: string;
      description?: string;
      openingBalance?: number;
      status?: string;
    },
  ) {
    await this.findAccountById(id);
    const values: any = {};
    if (params.accountCode !== undefined)
      values.accountCode = params.accountCode;
    if (params.accountName !== undefined)
      values.accountName = params.accountName;
    if (params.accountType !== undefined)
      values.accountType = params.accountType;
    if (params.parentId !== undefined) values.parentId = params.parentId;
    if (params.description !== undefined)
      values.description = params.description;
    if (params.openingBalance !== undefined)
      values.openingBalance = String(params.openingBalance);
    if (params.status !== undefined) values.status = params.status;
    values.updatedAt = new Date();

    if (Object.keys(values).length > 1) {
      await this.db.db
        .update(schema.accountingAccounts)
        .set(values)
        .where(eq(schema.accountingAccounts.id, id));
    }
    return this.findAccountById(id);
  }

  async deleteAccount(id: string) {
    await this.findAccountById(id);
    await this.db.db
      .update(schema.accountingAccounts)
      .set({ deletedAt: new Date() })
      .where(eq(schema.accountingAccounts.id, id));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JOURNAL ENTRIES
  // ═══════════════════════════════════════════════════════════════════════════

  async createJournalEntry(params: {
    tenantId: string;
    branchId: string;
    entryDate: string;
    reference?: string;
    description?: string;
    entryType?: string;
    items: {
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
    }[];
    createdBy?: string;
  }) {
    if (!params.items || params.items.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 items');
    }

    const totalDebit = params.items.reduce((s, i) => s + (i.debit || 0), 0);
    const totalCredit = params.items.reduce((s, i) => s + (i.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Debits (${totalDebit}) must equal credits (${totalCredit})`,
      );
    }

    for (const item of params.items) {
      if ((item.debit || 0) > 0 && (item.credit || 0) > 0) {
        throw new BadRequestException(
          'An item cannot have both debit and credit values',
        );
      }
      if ((item.debit || 0) === 0 && (item.credit || 0) === 0) {
        throw new BadRequestException(
          'Each item must have either a debit or credit value',
        );
      }
    }

    const entryId = uuidv4();
    const entryNumber = `JE-${Date.now()}`;

    await this.db.db.insert(schema.accountingJournalEntries).values({
      id: entryId,
      tenantId: params.tenantId,
      branchId: params.branchId,
      entryNumber,
      entryDate: params.entryDate,
      reference: params.reference,
      description: params.description,
      entryType: params.entryType || 'journal',
      createdBy: params.createdBy,
    });

    for (const item of params.items) {
      await this.db.db.insert(schema.accountingJournalEntryItems).values({
        id: uuidv4(),
        journalEntryId: entryId,
        accountId: item.accountId,
        debit: String(item.debit || 0),
        credit: String(item.credit || 0),
        description: item.description,
      });
    }

    return this.findJournalEntryById(entryId);
  }

  async findJournalEntryById(id: string) {
    const [entry] = await this.db.db
      .select()
      .from(schema.accountingJournalEntries)
      .where(eq(schema.accountingJournalEntries.id, id))
      .limit(1);
    if (!entry) throw new NotFoundException('Journal entry not found');

    const items = await this.db.db
      .select()
      .from(schema.accountingJournalEntryItems)
      .where(eq(schema.accountingJournalEntryItems.journalEntryId, id));

    return { ...entry, items };
  }

  async findJournalEntriesByBranch(
    branchId: string,
    query?: {
      page?: number;
      limit?: number;
      fromDate?: string;
      toDate?: string;
      accountId?: string;
    },
  ) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.accountingJournalEntries.branchId, branchId),
    ];

    if (query?.fromDate)
      conditions.push(
        sql`${schema.accountingJournalEntries.entryDate} >= ${query.fromDate}`,
      );
    if (query?.toDate)
      conditions.push(
        sql`${schema.accountingJournalEntries.entryDate} <= ${query.toDate}`,
      );
    if (query?.accountId) {
      const subQuery = this.db.db
        .select({ id: schema.accountingJournalEntryItems.journalEntryId })
        .from(schema.accountingJournalEntryItems)
        .where(
          eq(schema.accountingJournalEntryItems.accountId, query.accountId),
        );
      conditions.push(
        sql`${schema.accountingJournalEntries.id} IN (${subQuery})`,
      );
    }

    const data = await this.db.db
      .select()
      .from(schema.accountingJournalEntries)
      .where(and(...conditions))
      .orderBy(desc(schema.accountingJournalEntries.entryDate))
      .limit(limit)
      .offset(offset);

    const [total] = await this.db.db
      .select({ count: count() })
      .from(schema.accountingJournalEntries)
      .where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIAL BALANCE
  // ═══════════════════════════════════════════════════════════════════════════

  async getTrialBalance(branchId: string, fromDate?: string, toDate?: string) {
    const conditions: any[] = ['a.branch_id = $1'];
    const params: any[] = [branchId];
    let paramIndex = 2;

    if (fromDate) {
      conditions.push(`je.entry_date >= $${paramIndex++}`);
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push(`je.entry_date <= $${paramIndex++}`);
      params.push(toDate);
    }

    const sqlStr = `
      SELECT
        a.id, a.account_code, a.account_name, a.account_type,
        COALESCE(SUM(jei.debit::numeric), 0) AS total_debit,
        COALESCE(SUM(jei.credit::numeric), 0) AS total_credit,
        COALESCE(SUM(jei.debit::numeric), 0) - COALESCE(SUM(jei.credit::numeric), 0) AS balance
      FROM accounting_accounts a
      LEFT JOIN accounting_journal_entry_items jei ON a.id = jei.account_id
      LEFT JOIN accounting_journal_entries je ON jei.journal_entry_id = je.id
      WHERE a.branch_id = $1 AND a.deleted_at IS NULL
        AND ${conditions.join(' AND ')}
      GROUP BY a.id, a.account_code, a.account_name, a.account_type
      ORDER BY a.account_code
    `;

    const result = await this.db.query(sqlStr, params);
    return result.rows;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INCOME STATEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async getIncomeStatement(branchId: string, fromDate: string, toDate: string) {
    const result = await this.db.query(
      `
      SELECT
        a.account_type,
        a.id, a.account_code, a.account_name,
        COALESCE(SUM(jei.debit::numeric), 0) AS total_debit,
        COALESCE(SUM(jei.credit::numeric), 0) AS total_credit,
        CASE
          WHEN a.account_type = 'income' THEN COALESCE(SUM(jei.credit::numeric), 0) - COALESCE(SUM(jei.debit::numeric), 0)
          WHEN a.account_type = 'expense' THEN COALESCE(SUM(jei.debit::numeric), 0) - COALESCE(SUM(jei.credit::numeric), 0)
          ELSE 0
        END AS balance
      FROM accounting_accounts a
      LEFT JOIN accounting_journal_entry_items jei ON a.id = jei.account_id
      LEFT JOIN accounting_journal_entries je ON jei.journal_entry_id = je.id
      WHERE a.branch_id = $1 AND a.deleted_at IS NULL
        AND a.account_type IN ('income', 'expense')
        AND je.entry_date >= $2 AND je.entry_date <= $3
      GROUP BY a.id, a.account_code, a.account_name, a.account_type
      ORDER BY a.account_type, a.account_code
    `,
      [branchId, fromDate, toDate],
    );

    const rows = result.rows;
    const totalIncome = rows
      .filter((r: any) => r.account_type === 'income')
      .reduce((sum: number, r: any) => sum + Number(r.balance), 0);
    const totalExpense = rows
      .filter((r: any) => r.account_type === 'expense')
      .reduce((sum: number, r: any) => sum + Number(r.balance), 0);

    return {
      accounts: rows,
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      fromDate,
      toDate,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BALANCE SHEET
  // ═══════════════════════════════════════════════════════════════════════════

  async getBalanceSheet(branchId: string, asOfDate: string) {
    const result = await this.db.query(
      `
      SELECT
        a.account_type,
        a.id, a.account_code, a.account_name,
        COALESCE(SUM(jei.debit::numeric), 0) AS total_debit,
        COALESCE(SUM(jei.credit::numeric), 0) AS total_credit,
        CASE
          WHEN a.account_type = 'asset' THEN COALESCE(SUM(jei.debit::numeric), 0) - COALESCE(SUM(jei.credit::numeric), 0) + COALESCE(a.opening_balance::numeric, 0)
          WHEN a.account_type IN ('liability', 'equity') THEN COALESCE(SUM(jei.credit::numeric), 0) - COALESCE(SUM(jei.debit::numeric), 0) + COALESCE(a.opening_balance::numeric, 0)
          ELSE 0
        END AS balance
      FROM accounting_accounts a
      LEFT JOIN accounting_journal_entry_items jei ON a.id = jei.account_id
      LEFT JOIN accounting_journal_entries je ON jei.journal_entry_id = je.id
      WHERE a.branch_id = $1 AND a.deleted_at IS NULL
        AND a.account_type IN ('asset', 'liability', 'equity')
        AND (je.entry_date <= $2 OR je.entry_date IS NULL)
      GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.opening_balance
      ORDER BY a.account_type, a.account_code
    `,
      [branchId, asOfDate],
    );

    const rows = result.rows;
    const totalAssets = rows
      .filter((r: any) => r.account_type === 'asset')
      .reduce((sum: number, r: any) => sum + Number(r.balance), 0);
    const totalLiabilities = rows
      .filter((r: any) => r.account_type === 'liability')
      .reduce((sum: number, r: any) => sum + Number(r.balance), 0);
    const totalEquity = rows
      .filter((r: any) => r.account_type === 'equity')
      .reduce((sum: number, r: any) => sum + Number(r.balance), 0);

    return {
      assets: rows.filter((r: any) => r.account_type === 'asset'),
      liabilities: rows.filter((r: any) => r.account_type === 'liability'),
      equity: rows.filter((r: any) => r.account_type === 'equity'),
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesEquity: totalLiabilities + totalEquity,
      asOfDate,
    };
  }
}
