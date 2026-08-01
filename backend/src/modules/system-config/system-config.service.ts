import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(private readonly db: DatabaseProvider) {}

  async get(key: string) {
    const result = await this.db.db
      .select()
      .from(schema.systemConfig)
      .where(eq(schema.systemConfig.configKey, key))
      .limit(1);

    if (!result.length) return null;
    return result[0];
  }

  async getAll() {
    return this.db.db
      .select()
      .from(schema.systemConfig)
      .orderBy(schema.systemConfig.configKey);
  }

  async set(key: string, value: any, description?: string) {
    const existing = await this.db.db
      .select({ id: schema.systemConfig.id })
      .from(schema.systemConfig)
      .where(eq(schema.systemConfig.configKey, key))
      .limit(1);

    if (existing.length) {
      await this.db.db
        .update(schema.systemConfig)
        .set({
          configValue: value,
          description: description ?? null,
          updatedAt: new Date(),
        })
        .where(eq(schema.systemConfig.configKey, key));
    } else {
      await this.db.db.insert(schema.systemConfig).values({
        configKey: key,
        configValue: value,
        description: description ?? null,
      });
    }

    this.logger.log(`System config updated: ${key}`);
    return this.get(key);
  }

  async delete(key: string) {
    const result = await this.db.db
      .delete(schema.systemConfig)
      .where(eq(schema.systemConfig.configKey, key))
      .returning({ id: schema.systemConfig.id });

    if (!result.length) {
      throw new NotFoundException(`Config key '${key}' not found`);
    }
  }
}
