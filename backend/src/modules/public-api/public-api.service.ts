import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';

export interface PublicListOptions {
  limit?: number;
  offset?: number;
  status?: string;
  q?: string;
}

@Injectable()
export class PublicApiService {
  constructor(private readonly db: DatabaseProvider) {}

  async listStudents(
    tenantId: string,
    opts: PublicListOptions & {
      classId?: string;
      academicYearId?: string;
      branchId?: string;
    } = {},
  ) {
    const limit = this.pageLimit(opts.limit);
    const offset = this.pageOffset(opts.offset);

    const conditions = ['s.tenant_id = $1', 's.deleted_at IS NULL'];
    const params: unknown[] = [tenantId];

    if (opts.status) {
      params.push(opts.status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (opts.branchId) {
      params.push(opts.branchId);
      conditions.push(`s.branch_id = $${params.length}`);
    }
    if (opts.classId) {
      params.push(opts.classId);
      conditions.push(
        `EXISTS (SELECT 1 FROM student_academic_records r
                 WHERE r.student_id = s.id AND r.class_id = $${params.length})`,
      );
    }
    if (opts.academicYearId) {
      params.push(opts.academicYearId);
      conditions.push(
        `EXISTS (SELECT 1 FROM student_academic_records r
                 WHERE r.student_id = s.id AND r.academic_year_id = $${params.length})`,
      );
    }
    if (opts.q) {
      params.push(`%${opts.q}%`);
      conditions.push(
        `(s.first_name ILIKE $${params.length} OR s.last_name ILIKE $${params.length}
          OR s.admission_number ILIKE $${params.length})`,
      );
    }
    params.push(limit, offset);

    const where = conditions.join(' AND ');
    const result = await this.db.query(
      `SELECT s.id, s.admission_number, s.roll_number, s.first_name, s.middle_name,
              s.last_name, s.date_of_birth, s.gender, s.blood_group, s.category,
              s.phone, s.email, s.address, s.city, s.state, s.pincode,
              s.status, s.is_active, s.admission_date,
              (SELECT r.class_id FROM student_academic_records r
               WHERE r.student_id = s.id
               ORDER BY r.academic_year_id DESC LIMIT 1) AS current_class_id
       FROM students s
       WHERE ${where}
       ORDER BY s.admission_number
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  async getStudent(tenantId: string, studentId: string) {
    const result = await this.db.query(
      `SELECT s.id, s.admission_number, s.roll_number, s.first_name,
              s.middle_name, s.last_name, s.date_of_birth, s.gender,
              s.blood_group, s.category, s.status, s.is_active,
              s.admission_date, s.created_at,
              c.name AS class_name, sec.name AS section_name,
              ay.name AS academic_year
       FROM students s
       LEFT JOIN student_academic_records r ON r.student_id = s.id
       LEFT JOIN classes c ON c.id = r.class_id
       LEFT JOIN sections sec ON sec.id = r.section_id
       LEFT JOIN academic_years ay ON ay.id = r.academic_year_id
       WHERE s.id = $1 AND s.tenant_id = $2 AND s.deleted_at IS NULL
       ORDER BY r.academic_year_id DESC
       LIMIT 1`,
      [studentId, tenantId],
    );
    if (!result.rows.length) {
      throw new NotFoundException('Student not found');
    }
    return result.rows[0];
  }

  async listFeeAccounts(
    tenantId: string,
    opts: PublicListOptions & { studentId?: string } = {},
  ) {
    const limit = this.pageLimit(opts.limit);
    const offset = this.pageOffset(opts.offset);
    const conditions = ['a.tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (opts.studentId) {
      params.push(opts.studentId);
      conditions.push(`a.student_id = $${params.length}`);
    }
    if (opts.status) {
      params.push(opts.status);
      conditions.push(`a.status = $${params.length}`);
    }
    params.push(limit, offset);

    const result = await this.db.query(
      `SELECT a.id, a.student_id, a.fee_structure_id, a.academic_year_id,
              a.total_fee, a.total_discount, a.total_paid, a.total_due, a.status,
              a.created_at,
              s.admission_number,
              CONCAT(s.first_name, ' ', COALESCE(s.last_name, '')) AS student_name
       FROM student_fee_accounts a
       JOIN students s ON s.id = a.student_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  async listInvoices(
    tenantId: string,
    opts: PublicListOptions & {
      studentId?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const limit = this.pageLimit(opts.limit);
    const offset = this.pageOffset(opts.offset);
    const conditions = ['i.tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (opts.studentId) {
      params.push(opts.studentId);
      conditions.push(`i.student_id = $${params.length}`);
    }
    if (opts.status) {
      params.push(opts.status);
      conditions.push(`i.status = $${params.length}`);
    }
    if (opts.from) {
      params.push(opts.from);
      conditions.push(`i.invoice_date >= $${params.length}`);
    }
    if (opts.to) {
      params.push(opts.to);
      conditions.push(`i.invoice_date <= $${params.length}`);
    }
    params.push(limit, offset);

    const result = await this.db.query(
      `SELECT i.id, i.invoice_number, i.student_id, i.invoice_date, i.due_date,
              i.items, i.subtotal, i.discount_total, i.total_amount,
              i.amount_paid, i.balance_due, i.status, i.created_at,
              s.admission_number,
              CONCAT(s.first_name, ' ', COALESCE(s.last_name, '')) AS student_name
       FROM fee_invoices i
       JOIN students s ON s.id = i.student_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY i.invoice_date DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  async listPayments(
    tenantId: string,
    opts: PublicListOptions & {
      studentId?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const limit = this.pageLimit(opts.limit);
    const offset = this.pageOffset(opts.offset);
    const conditions = ['t.tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (opts.studentId) {
      params.push(opts.studentId);
      conditions.push(`t.student_id = $${params.length}`);
    }
    if (opts.from) {
      params.push(opts.from);
      conditions.push(`t.payment_date >= $${params.length}`);
    }
    if (opts.to) {
      params.push(opts.to);
      conditions.push(`t.payment_date <= $${params.length}`);
    }
    params.push(limit, offset);

    const result = await this.db.query(
      `SELECT t.id, t.transaction_no, t.invoice_no, t.student_id, t.amount,
              t.payment_method, t.payment_date, t.paid_date, t.reference_number,
              t.cheque_number, t.bank_name, t.upi_id, t.status, t.remarks,
              s.admission_number,
              CONCAT(s.first_name, ' ', COALESCE(s.last_name, '')) AS student_name
       FROM fee_transactions t
       JOIN students s ON s.id = t.student_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.payment_date DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  async listAttendance(
    tenantId: string,
    opts: PublicListOptions & {
      studentId?: string;
      classId?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const limit = this.pageLimit(opts.limit);
    const offset = this.pageOffset(opts.offset);

    if (!opts.studentId && !opts.classId) {
      throw new BadRequestException('Provide studentId or classId');
    }
    if (!opts.from || !opts.to) {
      throw new BadRequestException('Provide from and to date range');
    }

    const conditions = ['r.tenant_id = $1', 'a.date >= $2', 'a.date <= $3'];
    const params: unknown[] = [tenantId, opts.from, opts.to];

    if (opts.studentId) {
      params.push(opts.studentId);
      conditions.push(`r.student_id = $${params.length}`);
    }
    if (opts.classId) {
      params.push(opts.classId);
      conditions.push(`a.class_id = $${params.length}`);
    }
    params.push(limit, offset);

    const result = await this.db.query(
      `SELECT a.id AS attendance_id, a.date, a.class_id, a.section_id,
              r.student_id, r.status AS record_status, r.check_in_time,
              r.check_out_time, r.remarks,
              s.admission_number,
              CONCAT(s.first_name, ' ', COALESCE(s.last_name, '')) AS student_name
       FROM attendance_records r
       JOIN attendance a ON a.id = r.attendance_id
       JOIN students s ON s.id = r.student_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.date DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  async listResults(
    tenantId: string,
    opts: PublicListOptions & { studentId?: string; examId?: string } = {},
  ) {
    const limit = this.pageLimit(opts.limit);
    const offset = this.pageOffset(opts.offset);

    if (!opts.studentId && !opts.examId) {
      throw new BadRequestException('Provide studentId or examId');
    }

    const conditions = ['r.tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (opts.studentId) {
      params.push(opts.studentId);
      conditions.push(`r.student_id = $${params.length}`);
    }
    if (opts.examId) {
      params.push(opts.examId);
      conditions.push(`r.exam_id = $${params.length}`);
    }
    params.push(limit, offset);

    const result = await this.db.query(
      `SELECT r.id, r.exam_id, r.student_id, r.total_marks, r.percentage,
              r.grade, r.rank, r.result_status, r.is_promoted, r.remarks,
              e.name AS exam_name, e.exam_type, e.start_date AS exam_date,
              s.admission_number,
              CONCAT(s.first_name, ' ', COALESCE(s.last_name, '')) AS student_name
       FROM exam_results r
       JOIN exams e ON e.id = r.exam_id
       JOIN students s ON s.id = r.student_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.start_date DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  private pageLimit(raw?: number): number {
    return Math.min(100, Math.max(1, raw ?? 25));
  }

  private pageOffset(raw?: number): number {
    return Math.max(0, raw ?? 0);
  }
}
