jest.mock('src/infrastructure/config/envs', () => ({
  envs: {
    mail: {
      disabledUserRetentionDays: 30,
    },
  },
}));

import { PurgeDisabledUserMailJob } from './purge-disabled-user-mail.job';

const createQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn(),
});

describe('PurgeDisabledUserMailJob', () => {
  let userRepository: { createQueryBuilder: jest.Mock };
  let messageUserStateRepository: { createQueryBuilder: jest.Mock };
  let attachmentUserRefRepository: { createQueryBuilder: jest.Mock };
  let messageAttachmentRepository: { createQueryBuilder: jest.Mock };
  let fileStorage: { moveToDeleted: jest.Mock };
  let job: PurgeDisabledUserMailJob;

  beforeEach(() => {
    userRepository = { createQueryBuilder: jest.fn() };
    messageUserStateRepository = { createQueryBuilder: jest.fn() };
    attachmentUserRefRepository = { createQueryBuilder: jest.fn() };
    messageAttachmentRepository = { createQueryBuilder: jest.fn() };
    fileStorage = {
      moveToDeleted: jest.fn().mockResolvedValue({
        key: 'deleted/mail-attachments/one.pdf',
      }),
    };
    job = new PurgeDisabledUserMailJob(
      userRepository as any,
      messageUserStateRepository as any,
      attachmentUserRefRepository as any,
      messageAttachmentRepository as any,
      fileStorage as any,
    );
  });

  it('moves releasable disabled-user mail attachments through file storage', async () => {
    const usersQb = createQueryBuilder();
    usersQb.getRawMany.mockResolvedValue([{ id: 'user-1' }]);
    userRepository.createQueryBuilder.mockReturnValue(usersQb);

    const statesQb = createQueryBuilder();
    statesQb.execute.mockResolvedValue({ affected: 1 });
    messageUserStateRepository.createQueryBuilder.mockReturnValue(statesQb);

    const refsSelectQb = createQueryBuilder();
    refsSelectQb.getRawMany.mockResolvedValue([{ attachmentId: 'att-1' }]);
    const refsUpdateQb = createQueryBuilder();
    refsUpdateQb.execute.mockResolvedValue({ affected: 1 });
    attachmentUserRefRepository.createQueryBuilder
      .mockReturnValueOnce(refsSelectQb)
      .mockReturnValueOnce(refsUpdateQb);

    const attachmentsQb = createQueryBuilder();
    attachmentsQb.getRawMany.mockResolvedValue([
      {
        id: 'att-1',
        storageKey: 'private/mail-attachments/one.pdf',
        storedName: 'one.pdf',
      },
    ]);
    messageAttachmentRepository.createQueryBuilder.mockReturnValue(attachmentsQb);

    const result = await job.run();

    expect(fileStorage.moveToDeleted).toHaveBeenCalledWith(
      'private/mail-attachments/one.pdf',
      'mail-attachments',
    );
    expect(result.movedFiles).toBe(1);
  });
});
