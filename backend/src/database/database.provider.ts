import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseProvider implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.pool = new Pool({
      host: this.configService.get('database.host'),
      port: this.configService.get('database.port'),
      user: this.configService.get('database.user'),
      password: this.configService.get('database.password'),
      database: this.configService.get('database.database'),
      ssl: this.configService.get('database.ssl'),
      max: this.configService.get('database.maxConnections'),
      connectionTimeoutMillis:
        this.configService.get('database.connectionTimeoutMillis') ?? 10_000,
      idleTimeoutMillis:
        this.configService.get('database.idleTimeoutMillis') ?? 30_000,
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  getDb() {
    return this.db;
  }

  async query<T extends QueryResultRow = any>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }
}
