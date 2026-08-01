import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { and, count, eq, gte, sql, sum } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

interface OverviewParams {
  tenantId: string;
  branchId?: string | null;
}

interface ScopedTable {
  tenantId: SQL;
  branchId?: SQL;
}

function dateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseProvider) {}

  private scoped(table: ScopedTable, tenantId: string, branchId?: string | null) {
    const conds: SQL[] = [eq(table.tenantId, tenantId)];
    if (branchId && table.branchId) conds.push(eq(table.branchId, branchId));
    return conds;
  }

  async overview({ tenantId, branchId }: OverviewParams) {
    const t = tenantId;
    const branch = branchId;

    const countScoped = (table: ScopedTable, extra: SQL[] = []) =>
      this.db.db
        .select({ value: count() })
        .from(table as any)
        .where(and(...this.scoped(table, t, branch), ...extra))
        .then((rows) => Number(rows[0]?.value ?? 0));

    const [
      students,
      staff,
      classes,
      sections,
      subjects,
      branches,
      pendingApplications,
      enquiries,
      lowStockItems,
      announcements,
      homework,
      feeThisMonth,
      feeTotal,
      due,
      dueAccounts,
      attendanceToday,
      feeMonthly,
      attendanceWeekly,
    ] = await Promise.all([
      countScoped(schema.students as any, [eq((schema.students as any).isActive, true)]),
      countScoped(schema.staff as any, [eq((schema.staff as any).isActive, true)]),
      countScoped(schema.classes as any, [eq((schema.classes as any).isActive, true)]),
      countScoped(schema.sections as any),
      countScoped(schema.subjects as any),
      countScoped(schema.branches as any),
      countScoped(schema.applications as any, [eq((schema.applications as any).status, 'pending')]),
      countScoped(schema.enquiries as any),
      this.db.db
        .select({ value: count() })
        .from(schema.inventoryItems)
        .where(
          and(
            ...this.scoped(schema.inventoryItems as any, t, branch),
            eq(schema.inventoryItems.isActive, true),
            sql`${schema.inventoryItems.currentStock} <= ${schema.inventoryItems.reorderLevel}`,
          ),
        )
        .then((rows) => Number(rows[0]?.value ?? 0)),
      countScoped(schema.announcements as any),
      countScoped(schema.homework as any),
      this.sumFee(t, branch, undefined, 'month'),
      this.sumFee(t, branch, undefined, 'all'),
      this.db.db
        .select({ value: sum(schema.studentFeeAccounts.totalDue) })
        .from(schema.studentFeeAccounts)
        .where(
          and(
            ...this.scoped(schema.studentFeeAccounts as any, t, branch),
            eq(schema.studentFeeAccounts.status, 'active'),
          ),
        )
        .then((rows) => Number(rows[0]?.value ?? 0)),
      countScoped(schema.studentFeeAccounts as any, [
        eq((schema.studentFeeAccounts as any).status, 'active'),
        sql`${(schema.studentFeeAccounts as any).totalDue} > 0`,
      ]),
      this.attendanceToday(t, branch),
      this.feeMonthlySeries(t, branch),
      this.attendanceWeekly(t, branch),
    ]);

    return {
      asOf: dateStr(new Date()),
      totals: {
        students,
        staff,
        classes,
        sections,
        subjects,
        branches,
        pendingApplications,
        enquiries,
        lowStockItems,
        announcements,
        homework,
      },
      fees: {
        collectedThisMonth: feeThisMonth,
        collectedTotal: feeTotal,
        dueAmount: due,
        dueAccounts,
        monthlySeries: feeMonthly,
      },
      attendance: {
        today: attendanceToday,
        weekly: attendanceWeekly,
      },
    };
  }

  private async sumFee(
    tenantId: string,
    branchId: string | null | undefined,
    _feeAccountId?: string,
    range: 'month' | 'all' = 'all',
  ) {
    const t = tenantId;
    const conditions: SQL[] = [
      eq(schema.feeTransactions.tenantId, t),
      eq(schema.feeTransactions.status, 'completed'),
      ...(branchId
        ? [eq(schema.feeTransactions.branchId, branchId)]
        : []),
    ];
    if (range === 'month') {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(schema.feeTransactions.paymentDate, start));
    }
    const rows = await this.db.db
      .select({ value: sum(schema.feeTransactions.amount) })
      .from(schema.feeTransactions)
      .where(and(...conditions));
    return Number(rows[0]?.value ?? 0);
  }

  private async feeMonthlySeries(tenantId: string, branchId?: string | null) {
    const start = new Date();
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const monthCol = sql<string>`to_char(${schema.feeTransactions.paymentDate}, 'YYYY-MM')`;
    const rows = await this.db.db
      .select({ month: monthCol, amount: sum(schema.feeTransactions.amount) })
      .from(schema.feeTransactions)
      .where(
        and(
          eq(schema.feeTransactions.tenantId, tenantId),
          eq(schema.feeTransactions.status, 'completed'),
          gte(schema.feeTransactions.paymentDate, start),
          ...(branchId
            ? [eq(schema.feeTransactions.branchId, branchId)]
            : []),
        ),
      )
      .groupBy(monthCol)
      .orderBy(monthCol);

    const byMonth = new Map(rows.map((r) => [String(r.month), Number(r.amount ?? 0)]));
    const series: Array<{ month: string; amount: number }> = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 6; i++) {
      const key = monthKey(cursor);
      series.push({ month: key, amount: byMonth.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return series.reverse();
  }

  private async attendanceToday(tenantId: string, branchId?: string | null) {
    const todayStr = dateStr(new Date());
    const rows = await this.db.db
      .select({
        total: sum(schema.attendance.totalStudents),
        present: sum(schema.attendance.totalPresent),
        absent: sum(schema.attendance.totalAbsent),
      })
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.tenantId, tenantId),
          eq(schema.attendance.date, todayStr),
          ...(branchId ? [eq(schema.attendance.branchId, branchId)] : []),
        ),
      );
    const row = rows[0];
    const total = Number(row?.total ?? 0);
    const present = Number(row?.present ?? 0);
    const absent = Number(row?.absent ?? 0);
    return {
      date: todayStr,
      total,
      present,
      absent,
      marked: total > 0,
      rate: total > 0 ? Math.round((present / total) * 100) : null,
    };
  }

  private async attendanceWeekly(tenantId: string, branchId?: string | null) {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const startStr = dateStr(start);

    const rows = await this.db.db
      .select({
        date: schema.attendance.date,
        total: sum(schema.attendance.totalStudents),
        present: sum(schema.attendance.totalPresent),
        absent: sum(schema.attendance.totalAbsent),
      })
      .from(schema.attendance)
      .where(
        and(
          eq(schema.attendance.tenantId, tenantId),
          gte(schema.attendance.date, startStr),
          ...(branchId ? [eq(schema.attendance.branchId, branchId)] : []),
        ),
      )
      .groupBy(schema.attendance.date)
      .orderBy(schema.attendance.date);

    const byDate = new Map(rows.map((r) => [String(r.date), r]));
    const series: Array<{
      date: string;
      total: number;
      present: number;
      absent: number;
      rate: number | null;
    }> = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      const key = dateStr(day);
      const row = byDate.get(key);
      const total = Number(row?.total ?? 0);
      const present = Number(row?.present ?? 0);
      const absent = Number(row?.absent ?? 0);
      series.push({
        date: key,
        total,
        present,
        absent,
        rate: total > 0 ? Math.round((present / total) * 100) : null,
      });
    }
    return series;
  }
}
