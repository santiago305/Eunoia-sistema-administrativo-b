import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CreateYearlyPartitionsJob {
  private readonly logger = new Logger(CreateYearlyPartitionsJob.name);

  constructor(private readonly dataSource: DataSource) {}

  async run(targetYear?: number) {
    const year = targetYear ?? new Date().getUTCFullYear() + 1;
    const nextYear = year + 1;
    const tableName = `messages_${year}`;
    const defaultTableName = 'messages_default';

    const [tableInfo] = await this.dataSource.query(`
      SELECT c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'messages'
      LIMIT 1
    `);
    if (!tableInfo || tableInfo.relkind !== 'p') {
      this.logger.error(
        'create-yearly-partitions blocked: messages no es una tabla particionada (relkind!=p).',
      );
      return { created: null, reason: 'messages_not_partitioned_blocked' };
    }

    const sql = `
      CREATE TABLE IF NOT EXISTS ${tableName}
      PARTITION OF messages
      FOR VALUES FROM ('${year}-01-01') TO ('${nextYear}-01-01');
    `;
    const defaultSql = `
      CREATE TABLE IF NOT EXISTS ${defaultTableName}
      PARTITION OF messages DEFAULT;
    `;

    try {
      await this.dataSource.query(sql);
      await this.dataSource.query(defaultSql);
      this.logger.debug(`create-yearly-partitions created=${tableName}`);
      return { created: tableName, defaultPartition: defaultTableName };
    } catch (error) {
      this.logger.warn(`create-yearly-partitions skipped year=${year} reason=${(error as Error)?.message ?? 'unknown'}`);
      return { created: null, reason: (error as Error)?.message ?? 'unknown' };
    }
  }
}
