import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as schema from './schema';

// Request-scoped PostgreSQL GUC values (app.tenant_id, app.is_superadmin, ...).
// Set by middleware/interceptors/guards for the duration of one HTTP request;
// the GucAwarePool applies them atomically on whichever connection executes
// the query, so RLS policies always see the right request context.
export const tenantAls = new AsyncLocalStorage<Map<string, string>>();

// Applies the current request's GUCs on the acquired connection before every
// query, and on connect() so transactions inherit them too.
class GucAwarePool extends Pool {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any = async (text: string, values?: unknown[]) => {
    // NOTE: never delegate to Pool.prototype.query here — it uses the
    // callback form of this.connect(), which the async override below cannot
    // satisfy. Acquire the client explicitly instead.
    const client = await this.connect();
    try {
      return await client.query(text, values);
    } finally {
      client.release();
    }
  };

  async connect(): Promise<PoolClient> {
    const client = await super.connect();
    const gucs = tenantAls.getStore();
    if (gucs && gucs.size > 0) {
      try {
        for (const [key, value] of gucs) {
          await client.query(`SELECT set_config($1, $2, FALSE)`, [key, value]);
        }
      } catch (err) {
        client.release();
        throw err;
      }
    }
    return client;
  }
}

@Injectable()
export class DatabaseProvider implements OnModuleInit, OnModuleDestroy {
  private pool: GucAwarePool;
  public db: NodePgDatabase<typeof schema>;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.pool = new GucAwarePool({
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
    return this.pool.query(sql, params) as Promise<QueryResult<T>>;
  }

  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}