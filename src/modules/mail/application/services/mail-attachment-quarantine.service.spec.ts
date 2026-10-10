import { MailAttachmentQuarantineService } from './mail-attachment-quarantine.service';

describe('MailAttachmentQuarantineService', () => {
  const createRepository = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'quarantine-1', ...value })),
    findOne: jest.fn(),
    update: jest.fn(),
  });

  it('copies an attachment to quarantine and verifies its hash before writing the manifest', async () => {
    const repository = createRepository();
    const buffer = Buffer.from('mail attachment');
    const fileStorage = {
      read: jest.fn().mockResolvedValue(buffer),
      resolve: jest.fn().mockReturnValue({ filename: 'invoice.pdf' }),
      save: jest.fn().mockResolvedValue({ key: 'quarantine/mail-attachments/run/candidate.pdf' }),
      delete: jest.fn(),
    };

    const result = await new MailAttachmentQuarantineService(repository as any, fileStorage as any).quarantine({
      originalKey: 'private/mail-attachments/invoice.pdf',
      reason: 'double-audit-candidate',
      runId: '11111111-1111-4111-8111-111111111111',
    });

    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      area: 'quarantine',
      directory: 'mail-attachments/11111111-1111-4111-8111-111111111111',
      buffer,
    }));
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'QUARANTINED',
      originalKey: 'private/mail-attachments/invoice.pdf',
      quarantineKey: 'quarantine/mail-attachments/run/candidate.pdf',
      sizeBytes: String(buffer.length),
    }));
    expect(result.status).toBe('QUARANTINED');
  });

  it('restores a quarantined file to its original key when the original is missing', async () => {
    const repository = createRepository();
    repository.findOne.mockResolvedValue({
      id: 'quarantine-1',
      status: 'QUARANTINED',
      originalKey: 'private/mail-attachments/invoice.pdf',
      quarantineKey: 'quarantine/mail-attachments/run/candidate.pdf',
    });
    const fileStorage = {
      exists: jest.fn().mockResolvedValue(false),
      move: jest.fn().mockResolvedValue({ key: 'private/mail-attachments/invoice.pdf' }),
    };

    const result = await new MailAttachmentQuarantineService(repository as any, fileStorage as any).restore('quarantine-1');

    expect(fileStorage.move).toHaveBeenCalledWith(
      'quarantine/mail-attachments/run/candidate.pdf',
      'private/mail-attachments/invoice.pdf',
    );
    expect(repository.update).toHaveBeenCalledWith('quarantine-1', expect.objectContaining({ status: 'RESTORED' }));
    expect(result).toEqual({ id: 'quarantine-1', status: 'RESTORED', originalKey: 'private/mail-attachments/invoice.pdf' });
  });
});
