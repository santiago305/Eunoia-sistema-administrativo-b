import { BadRequestException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { NotificationAttachmentsService } from './notification-attachments.service';

const createRepository = () => ({
  create: jest.fn((value) => value),
  delete: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
});

describe('NotificationAttachmentsService', () => {
  const userId = '2df19cf0-cf5f-41ca-b78d-962f6bbfb7ee';
  const draftId = '36ab7ea4-6cda-4be7-9440-5f9bec7e1de4';

  let attachmentRepository: ReturnType<typeof createRepository>;
  let messageRepository: ReturnType<typeof createRepository>;
  let attachmentUserRefRepository: ReturnType<typeof createRepository>;
  let service: NotificationAttachmentsService;

  beforeEach(() => {
    attachmentRepository = createRepository();
    messageRepository = createRepository();
    attachmentUserRefRepository = createRepository();
    messageRepository.findOne.mockResolvedValue({
      id: draftId,
      createdByUserId: userId,
      isDraft: true,
      status: 'DRAFT',
    });
    attachmentRepository.save.mockImplementation(async (value) => ({
      id: 'attachment-id',
      createdAt: new Date('2026-05-20T10:00:00.000Z'),
      ...value,
    }));
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    service = new NotificationAttachmentsService(
      attachmentRepository as any,
      messageRepository as any,
      attachmentUserRefRepository as any,
      { canDownloadAttachment: jest.fn() } as any,
      { ensureMessageParticipant: jest.fn() } as any,
      {
        assertCanAddBytes: jest.fn(),
        trackAttachmentOwnership: jest.fn(),
        syncAttachmentRefsToMessage: jest.fn(),
        releaseAttachmentRefs: jest.fn(),
      } as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const upload = (overrides: Record<string, unknown> = {}) =>
    service.uploadAttachment({
      userId,
      fileName: 'archivo.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('%PDF-1.7\nmock'),
      draftId,
      modulePermissions: {},
      ...overrides,
    } as Parameters<NotificationAttachmentsService['uploadAttachment']>[0]);

  it('rejects attachments larger than 5 MB before writing to disk', async () => {
    await expect(upload({ size: 5 * 1024 * 1024 + 1 })).rejects.toThrow(
      new BadRequestException('ATTACHMENT_TOO_LARGE'),
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('stores a png uploaded as file without converting it to inline image', async () => {
    const result = (await upload({
      fileName: 'foto.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      kind: 'file' as any,
    })) as any;

    expect(result.attachmentKind).toBe('file');
    expect(attachmentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        originalName: 'foto.png',
        mimeType: 'image/png',
        attachmentKind: 'file',
      }),
    );
  });

  it('rejects a pdf uploaded through the image flow', async () => {
    await expect(upload({ kind: 'image' as any })).rejects.toThrow(
      new BadRequestException('ATTACHMENT_IMAGE_MIME_REQUIRED'),
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('rejects spoofed files when extension/mime do not match binary signature', async () => {
    await expect(
      upload({
        fileName: 'foto.png',
        mimeType: 'image/png',
        buffer: Buffer.from('%PDF-1.7\nthis-is-not-png'),
      }),
    ).rejects.toThrow(new BadRequestException('ATTACHMENT_SIGNATURE_MISMATCH'));
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('purges draft attachments by moving binaries, releasing refs and deleting rows', async () => {
    const attachments = [
      { id: 'att-1', draftId, uploadedByUserId: userId, storedName: 'one.pdf', storageKey: 'c:/tmp/one.pdf' },
      { id: 'att-2', draftId, uploadedByUserId: userId, storedName: 'two.pdf', storageKey: 'c:/tmp/two.pdf' },
    ];
    attachmentRepository.find.mockResolvedValue(attachments);
    attachmentRepository.delete.mockResolvedValue({ affected: 2 });

    const moveSpy = jest
      .spyOn(service as any, 'moveAttachmentToDeletedArea')
      .mockResolvedValue(undefined);

    const result = await service.purgeDraftAttachments(userId, draftId);

    expect(moveSpy).toHaveBeenCalledTimes(2);
    expect((service as any).mailStorageQuotaService.releaseAttachmentRefs).toHaveBeenCalledWith({
      attachmentIds: ['att-1', 'att-2'],
      userId,
      manager: undefined,
    });
    expect(attachmentRepository.delete).toHaveBeenCalledWith(['att-1', 'att-2']);
    expect(result).toEqual({ deleted: 2 });
  });

  it('does nothing when draft has no attachments to purge', async () => {
    attachmentRepository.find.mockResolvedValue([]);

    const result = await service.purgeDraftAttachments(userId, draftId);

    expect((service as any).mailStorageQuotaService.releaseAttachmentRefs).not.toHaveBeenCalled();
    expect(attachmentRepository.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ deleted: 0 });
  });
});
