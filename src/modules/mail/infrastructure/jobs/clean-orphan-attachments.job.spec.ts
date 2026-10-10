import { CleanOrphanAttachmentsJob } from './clean-orphan-attachments.job';

describe('CleanOrphanAttachmentsJob', () => {
  it('audits database and physical keys without deleting anything', async () => {
    const attachmentRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'att-present',
          storageKey: 'private/mail-attachments/present.webp',
          messageId: 'message-1',
          draftId: null,
          createdAt: new Date('2026-10-01T00:00:00.000Z'),
        },
        {
          id: 'att-missing',
          storageKey: 'private/mail-attachments/missing.webp',
          messageId: null,
          draftId: null,
          createdAt: new Date('2026-10-01T00:00:00.000Z'),
        },
      ]),
      createQueryBuilder: jest.fn(),
    };
    const fileStorage = {
      list: jest.fn().mockResolvedValue([
        'private/mail-attachments/present.webp',
        'private/mail-attachments/unreferenced.webp',
      ]),
    };

    const job = new CleanOrphanAttachmentsJob(
      attachmentRepository as any,
      fileStorage as any,
    );
    const result = await job.run();

    expect(result).toEqual({
      scanned: 2,
      physical: 2,
      missingPhysical: ['private/mail-attachments/missing.webp'],
      unreferencedPhysical: ['private/mail-attachments/unreferenced.webp'],
      unlinkedExpired: ['att-missing'],
      deleted: 0,
    });
    expect(attachmentRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
