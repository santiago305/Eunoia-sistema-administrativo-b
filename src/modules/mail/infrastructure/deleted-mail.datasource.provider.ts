import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { envs } from 'src/infrastructure/config/envs';
import { DeletedMailMessageEntity } from '../adapters/out/persistence/typeorm/entities/deleted-mail-message.entity';
import { DeletedMailMessageUserStateEntity } from '../adapters/out/persistence/typeorm/entities/deleted-mail-message-user-state.entity';
import { DeletedMailAttachmentEntity } from '../adapters/out/persistence/typeorm/entities/deleted-mail-attachment.entity';
import { DeletedMailAuditLogEntity } from '../adapters/out/persistence/typeorm/entities/deleted-mail-audit-log.entity';
import { CreateDeletedMailArchive20260522190000 } from 'src/infrastructure/database/migrations/20260522190000-create-deleted-mail-archive';
import { CreateDeletedMailArchiveOperations20261010020000 } from 'src/infrastructure/database/migrations/20261010020000-create-deleted-mail-archive-operations';
import { DeletedMailArchiveOperationEntity } from '../adapters/out/persistence/typeorm/entities/deleted-mail-archive-operation.entity';

@Injectable()
export class DeletedMailDataSourceProvider implements OnModuleDestroy {
  private readonly logger = new Logger(DeletedMailDataSourceProvider.name);
  private dataSource: DataSource | null = null;
  private initializing: Promise<DataSource | null> | null = null;

  private isConfigured() {
    return Boolean(envs.mail.deletedDb.enabled);
  }

  async getDataSource(): Promise<DataSource | null> {
    if (!this.isConfigured()) {
      return null;
    }
    if (this.dataSource?.isInitialized) {
      return this.dataSource;
    }
    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = this.initializeDataSource();
    return this.initializing;
  }

  private async initializeDataSource(): Promise<DataSource | null> {
    try {
      const deletedDbPort = Number(envs.mail.deletedDb.port ?? 0);
      if (!deletedDbPort) {
        this.logger.warn('MAIL_DELETED_DB_PORT missing. Deleted DB disabled.');
        return null;
      }

      const dataSource = new DataSource({
        type: 'postgres',
        host: envs.mail.deletedDb.host!,
        port: deletedDbPort,
        username: envs.mail.deletedDb.username!,
        password: envs.mail.deletedDb.password ?? '',
        database: envs.mail.deletedDb.name!,
        logging: false,
        // The secondary schema must be created by reviewed migrations. Never
        // let a production process mutate it implicitly at startup.
        synchronize: false,
        migrationsTableName: 'typeorm_deleted_mail_migrations',
        migrations: [
          CreateDeletedMailArchive20260522190000,
          CreateDeletedMailArchiveOperations20261010020000,
        ],
        entities: [
          DeletedMailMessageEntity,
          DeletedMailMessageUserStateEntity,
          DeletedMailAttachmentEntity,
          DeletedMailAuditLogEntity,
          DeletedMailArchiveOperationEntity,
        ],
      });

      await dataSource.initialize();
      this.dataSource = dataSource;
      this.logger.log('Deleted mail datasource initialized.');
      return dataSource;
    } catch (error) {
      this.logger.warn(
        `Deleted mail datasource unavailable: ${(error as Error)?.message ?? 'unknown'}`,
      );
      this.dataSource = null;
      return null;
    } finally {
      this.initializing = null;
    }
  }

  async onModuleDestroy() {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
    this.dataSource = null;
  }
}

