jest.mock('src/infrastructure/config/envs', () => ({
  envs: {
    mail: {
      deletedRetentionDays: 30,
    },
  },
}));

import { ArchiveDeletedMailJob } from './archive-deleted-mail.job';

const createRepository = () => ({
  createQueryBuilder: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
});

const createDeletedRepository = () => ({
  upsert: jest.fn().mockResolvedValue(undefined),
});

describe('ArchiveDeletedMailJob', () => {
  let messageRepository: ReturnType<typeof createRepository>;
  let messageUserStateRepository: ReturnType<typeof createRepository>;
  let messageAttachmentRepository: ReturnType<typeof createRepository>;
  let messageRecipientRepository: ReturnType<typeof createRepository>;
  let messageAuditLogRepository: ReturnType<typeof createRepository>;
  let dataSource: { transaction: jest.Mock };
  let deletedDataSourceProvider: { getDataSource: jest.Mock };
  let deletedDataSource: { transaction: jest.Mock };
  let fileStorage: { moveToDeleted: jest.Mock };
  let job: ArchiveDeletedMailJob;

  beforeEach(() => {
    messageRepository = createRepository();
    messageUserStateRepository = createRepository();
    messageAttachmentRepository = createRepository();
    messageRecipientRepository = createRepository();
    messageAuditLogRepository = createRepository();
    dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          getRepository: jest.fn(() => ({ delete: jest.fn().mockResolvedValue(undefined) })),
          query: jest.fn().mockResolvedValue([]),
        }),
      ),
    };
    deletedDataSource = {
      transaction: jest.fn(async (callback) => {
        const repos = [
          createDeletedRepository(),
          createDeletedRepository(),
          createDeletedRepository(),
          createDeletedRepository(),
        ];
        return callback({ getRepository: jest.fn(() => repos.shift()) });
      }),
    };
    deletedDataSourceProvider = {
      getDataSource: jest.fn().mockResolvedValue(deletedDataSource),
    };
    fileStorage = {
      moveToDeleted: jest.fn().mockResolvedValue({
        key: 'deleted/mail-attachments/one.pdf',
      }),
    };
    job = new ArchiveDeletedMailJob(
      messageRepository as any,
      messageUserStateRepository as any,
      messageAttachmentRepository as any,
      messageRecipientRepository as any,
      messageAuditLogRepository as any,
      dataSource as any,
      deletedDataSourceProvider as any,
      fileStorage as any,
    );
  });

  it('moves archived mail attachments through file storage', async () => {
    const messageId = 'message-1';
    const permanentlyHiddenAt = new Date('2026-05-20T10:00:00.000Z');
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      andHaving: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ messageId }]),
    };
    messageUserStateRepository.createQueryBuilder.mockReturnValue(qb);
    messageRepository.find.mockResolvedValue([{ id: messageId, threadId: null }]);
    messageUserStateRepository.find.mockResolvedValue([
      { id: 'state-1', messageId, userId: 'user-1', permanentlyHiddenAt },
    ]);
    messageAttachmentRepository.find.mockResolvedValue([
      {
        id: 'att-1',
        messageId,
        originalName: 'one.pdf',
        storedName: 'one.pdf',
        mimeType: 'application/pdf',
        sizeBytes: '100',
        storageKey: 'private/mail-attachments/one.pdf',
        attachmentKind: 'file',
        uploadedByUserId: 'user-1',
        createdAt: permanentlyHiddenAt,
      },
    ]);
    messageRecipientRepository.find.mockResolvedValue([]);
    messageAuditLogRepository.find.mockResolvedValue([]);

    await job.run();

    expect(fileStorage.moveToDeleted).toHaveBeenCalledWith(
      'private/mail-attachments/one.pdf',
      'mail-attachments',
    );
  });
});
