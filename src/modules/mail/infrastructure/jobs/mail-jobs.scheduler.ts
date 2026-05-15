import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ExpireDraftsJob } from './expire-drafts.job';
import { ExpireTrashJob } from './expire-trash.job';
import { ReleaseSnoozedMessagesJob } from './release-snoozed-messages.job';
import { CleanOrphanAttachmentsJob } from './clean-orphan-attachments.job';
import { CreateYearlyPartitionsJob } from './create-yearly-partitions.job';

@Injectable()
export class MailJobsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailJobsScheduler.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly runningJobs = new Set<string>();

  constructor(
    private readonly expireDraftsJob: ExpireDraftsJob,
    private readonly expireTrashJob: ExpireTrashJob,
    private readonly releaseSnoozedMessagesJob: ReleaseSnoozedMessagesJob,
    private readonly cleanOrphanAttachmentsJob: CleanOrphanAttachmentsJob,
    private readonly createYearlyPartitionsJob: CreateYearlyPartitionsJob,
  ) {}

  onModuleInit() {
    this.schedule('release-snoozed', 60_000, () => this.releaseSnoozedMessagesJob.run());
    this.schedule('expire-trash', 5 * 60_000, () => this.expireTrashJob.run());
    this.schedule('expire-drafts', 60 * 60_000, () => this.expireDraftsJob.run());
    this.schedule('clean-orphan-attachments', 6 * 60 * 60_000, () => this.cleanOrphanAttachmentsJob.run());
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
      try {
        const result = await runner();
        this.logger.debug(`${name} completed in ${Date.now() - startedAt}ms result=${JSON.stringify(result)}`);
      } finally {
        this.runningJobs.delete(name);
      }
    };

    void runSafely().catch((error) => {
      this.logger.warn(`${name} initial run failed: ${(error as Error)?.message ?? 'unknown'}`);
    });
    const timer = setInterval(() => {
      void runSafely().catch((error) => {
        this.logger.warn(`${name} run failed: ${(error as Error)?.message ?? 'unknown'}`);
      });
    }, everyMs);
    this.timers.push(timer);
  }
}
