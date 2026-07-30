import { Injectable, Logger } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { PaginationParams } from '../helpers/pagination.helper';

@Injectable()
export abstract class CrudService {
  protected abstract readonly tableName: string;
  protected abstract readonly tenantColumn: string;
  protected abstract readonly logger: Logger;

  constructor(protected readonly db: DatabaseProvider) {}

  protected get query() {
    return this.db;
  }

  protected async count(whereClause: string, params: unknown[]): Promise<number> {
    const result = await this.query.query(
      `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`,
      params,
    );
    return parseInt(String((result.rows[0] as any).count), 10);
  }

  protected async findMany(
    selectClause: string,
    whereClause: string,
    params: unknown[],
    pagination?: PaginationParams,
    joins = '',
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const total = await this.count(whereClause, params);

    let queryStr = `SELECT ${selectClause} FROM ${this.tableName} ${joins} WHERE ${whereClause}`;

    if (pagination?.sortBy) {
      const dir = pagination.sortOrder === 'desc' ? 'DESC' : 'ASC';
      queryStr += ` ORDER BY ${pagination.sortBy} ${dir}`;
    } else {
      queryStr += ' ORDER BY created_at DESC';
    }

    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      queryStr += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(pagination.limit, offset);
    }

    const result = await this.query.query(queryStr, params);
    return { data: result.rows, total };
  }

  protected async findById(
    id: string,
    tenantId?: string,
    selectClause = '*',
    joins = '',
  ): Promise<Record<string, unknown> | null> {
    let queryStr = `SELECT ${selectClause} FROM ${this.tableName} ${joins} WHERE id = $1 AND deleted_at IS NULL`;
    const params: unknown[] = [id];

    if (tenantId) {
      queryStr += ` AND ${this.tenantColumn} = $2`;
      params.push(tenantId);
    }

    const result = await this.query.query(queryStr, params);
    return (result.rows[0] as Record<string, unknown>) || null;
  }

  protected async softDelete(
    id: string,
    tenantId?: string,
  ): Promise<boolean> {
    let queryStr = `UPDATE ${this.tableName} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`;
    const params: unknown[] = [id];

    if (tenantId) {
      queryStr += ` AND ${this.tenantColumn} = $2`;
      params.push(tenantId);
    }

    const result = await this.query.query(queryStr, params);
    return (result.rowCount || 0) > 0;
  }

  protected async exists(
    id: string,
    tenantId?: string,
  ): Promise<boolean> {
    let queryStr = `SELECT 1 FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL`;
    const params: unknown[] = [id];

    if (tenantId) {
      queryStr += ` AND ${this.tenantColumn} = $2`;
      params.push(tenantId);
    }

    queryStr += ' LIMIT 1';
    const result = await this.query.query(queryStr, params);
    return result.rows.length > 0;
  }

  protected buildTenantWhere(
    tenantId?: string,
    additionalAnd?: string[],
  ): { clause: string; params: unknown[] } {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];

    if (tenantId) {
      conditions.push(`${this.tenantColumn} = $${params.length + 1}`);
      params.push(tenantId);
    }

    if (additionalAnd?.length) {
      conditions.push(...additionalAnd);
    }

    return { clause: conditions.join(' AND '), params };
  }
}
