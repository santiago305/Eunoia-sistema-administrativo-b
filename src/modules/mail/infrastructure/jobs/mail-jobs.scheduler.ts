import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { ExpireDraftsJob } from './expire-drafts.job';
import { ExpireTrashJob } from './expire-trash.job';
import { ReleaseSnoozedMessagesJob } from './release-snoozed-messages.job';
import { ReleaseScheduledMessagesJob } from './release-scheduled-messages.job';
import { CleanOrphanAttachmentsJob } from './clean-orphan-attachments.job';
import { CreateYearlyPartitionsJob } from './create-yearly-partitions.job';
import { ArchiveDeletedMailJob } from './archive-deleted-mail.job';
import { PurgeDisabledUserMailJob } from './purge-disabled-user-mail.job';
import { envs } from 'src/infrastructure/config/envs';
import { RecoverMailAttachmentOperationsJob } from './recover-mail-attachment-operations.job';

@Injectable()
export class MailJobsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailJobsScheduler.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly runningJobs = new Set<string>();

  constructor(
    private readonly expireDraftsJob: ExpireDraftsJob,
    private readonly expireTrashJob: ExpireTrashJob,
    private readonly releaseSnoozedMessagesJob: ReleaseSnoozedMessagesJob,
    private readonly releaseScheduledMessagesJob: ReleaseScheduledMessagesJob,
    private readonly cleanOrphanAttachmentsJob: CleanOrphanAttachmentsJob,
    private readonly createYearlyPartitionsJob: CreateYearlyPartitionsJob,
    private readonly archiveDeletedMailJob: ArchiveDeletedMailJob,
    private readonly purgeDisabledUserMailJob: PurgeDisabledUserMailJob,
    private readonly recoverMailAttachmentOperationsJob: RecoverMailAttachmentOperationsJob,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    if (!envs.mail.jobs.enabled) {
      this.logger.log('mail jobs disabled by MAIL_JOBS_ENABLED');
      return;
    }
    this.schedule('release-snoozed', 60_000, () => this.releaseSnoozedMessagesJob.run());
    this.schedule('release-scheduled', 60_000, () => this.releaseScheduledMessagesJob.run());
    this.schedule('expire-trash', 5 * 60_000, () => this.expireTrashJob.run());
    if (envs.mail.jobs.draftExpirationV2Enabled) {
      this.schedule('expire-drafts', 60 * 60_000, () => this.expireDraftsJob.run());
    }
    if (envs.mail.jobs.orphanAuditEnabled) {
      this.schedule('clean-orphan-attachments', 6 * 60 * 60_000, () => this.cleanOrphanAttachmentsJob.run());
    }
    if (envs.mail.jobs.deletedArchiveEnabled) {
      this.schedule('archive-deleted-mail', 6 * 60 * 60_000, () => this.archiveDeletedMailJob.run());
    }
    if (envs.mail.jobs.attachmentRecoveryWorkerEnabled) {
      this.schedule('recover-mail-attachment-operations', 5 * 60_000, () => this.recoverMailAttachmentOperationsJob.run());
    }
    this.schedule('purge-disabled-user-mail', 24 * 60 * 60_000, () => this.purgeDisabledUserMailJob.run());
    this.schedule('create-yearly-partitions', 24 * 60 * 60_000, () => this.createYearlyPartitionsJob.run());
  }

  onModuleDestroy() {
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.length = 0;
  }

  private schedule(name: string, everyMs: number, runner: () => Promise<unknown>) {
    const runSafely = async () => {
      if (this.runningJobs.has(name)) {
        this.logger.debug(`${name} skipped: previous run still in progress`);
        return;
      }
      this.runningJobs.add(name);
      const startedAt = Date.now();
      let queryRunner: QueryRunner | null = null;
      try {
        queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        const lockKey = `eunoia:mail-job:${name}`;
        const lockRows = await queryRunner.query(
          'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
          [lockKey],
        );
        if (!Boolean(lockRows?.[0]?.locked)) {
          this.logger.debug(`${name} skipped: another instance owns the database lock`);
          return;
        }
        const result = await runner();
        this.logger.debug(`${name} completed in ${Date.now() - startedAt}ms result=${JSON.stringify(result)}`);
      } finally {
        if (queryRunner) {
          try {
            await queryRunner.query(
              'SELECT pg_advisory_unlock(hashtext($1))',
              [`eunoia:mail-job:${name}`],
            );
          } catch (error) {
            this.logger.warn(
              `${name} database lock release failed: ${(error as Error)?.message ?? 'unknown'}`,
            );
          } finally {
            await queryRunner.release();
          }
        }
        this.runningJobs.delete(name);
      }
    };

    if (envs.mail.jobs.runOnStart) {
      void runSafely().catch((error) => {
        this.logger.warn(`${name} initial run failed: ${(error as Error)?.message ?? 'unknown'}`);
      });
    }
    const timer = setInterval(() => {
      void runSafely().catch((error) => {
        this.logger.warn(`${name} run failed: ${(error as Error)?.message ?? 'unknown'}`);
      });
    }, everyMs);
    this.timers.push(timer);
  }
}
