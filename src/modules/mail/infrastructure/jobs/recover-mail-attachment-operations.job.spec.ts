import { RecoverMailAttachmentOperationsJob } from './recover-mail-attachment-operations.job';

describe('RecoverMailAttachmentOperationsJob', () => {
  it('cleans staged binaries without database attachments and recovers registered ones', async () => {
    const operations = [
      { id: 'op-1', status: 'STAGED', storageKey: 'staging/mail-attachments/a.pdf', attachmentId: null, userId: 'u-1', attempts: 0, createdAt: new Date() },
      { id: 'op-2', status: 'REGISTERED', storageKey: 'private/mail-attachments/b.pdf', attachmentId: 'att-2', userId: 'u-2', attempts: 0, createdAt: new Date() },
    ];
    const operationRepository = {
      find: jest.fn().mockResolvedValue(operations),
      update: jest.fn().mockResolvedValue(undefined),
    } as any;
    const attachmentRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'att-2', messageId: 'msg-2' }),
    } as any;
    const quotaService = { trackAttachmentOwnership: jest.fn().mockResolvedValue(undefined) } as any;
    const fileStorage = { exists: jest.fn().mockResolvedValue(true), delete: jest.fn().mockResolvedValue(true) } as any;
    const job = new RecoverMailAttachmentOperationsJob(operationRepository, attachmentRepository, quotaService, fileStorage);

    await expect(job.run()).resolves.toEqual({ scanned: 2, recovered: 1, failed: 1 });
    expect(fileStorage.delete).toHaveBeenCalledWith('staging/mail-attachments/a.pdf');
    expect(quotaService.trackAttachmentOwnership).toHaveBeenCalledWith(expect.objectContaining({ attachmentId: 'att-2', userId: 'u-2' }));
  });
});
