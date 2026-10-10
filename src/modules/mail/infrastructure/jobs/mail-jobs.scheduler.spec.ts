jest.mock('src/infrastructure/config/envs', () => ({
  envs: {
    mail: {
      jobs: {
        enabled: false,
        runOnStart: false,
        draftExpirationV2Enabled: true,
        orphanAuditEnabled: true,
        deletedArchiveEnabled: false,
      },
    },
  },
}));

import { MailJobsScheduler } from './mail-jobs.scheduler';

describe('MailJobsScheduler feature gates', () => {
  it('does not schedule or execute jobs when MAIL_JOBS_ENABLED is false', () => {
    const jobs = Array.from({ length: 9 }, () => ({ run: jest.fn() }));
    const scheduler = new MailJobsScheduler(
      jobs[0] as any,
      jobs[1] as any,
      jobs[2] as any,
      jobs[3] as any,
      jobs[4] as any,
      jobs[5] as any,
      jobs[6] as any,
      jobs[7] as any,
      jobs[8] as any,
      {} as any,
    );

    scheduler.onModuleInit();
    scheduler.onModuleDestroy();

    expect(jobs.every((job) => job.run.mock.calls.length === 0)).toBe(true);
  });
});
