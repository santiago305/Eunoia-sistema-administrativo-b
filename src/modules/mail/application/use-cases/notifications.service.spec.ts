import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageRecipientEntity } from '../../adapters/out/persistence/typeorm/entities/message-recipient.entity';
import { MessageThread } from '../../adapters/out/persistence/typeorm/entities/message-thread.entity';

const createNotificationsService = (parent: Record<string, unknown>) => {
  const messageRepository = {
    findOne: jest.fn().mockResolvedValue(parent),
  };
  const recipientResolver = {
    resolveReplyRecipientsOrFail: jest.fn(),
    resolveRecipientsByBucketsOrFail: jest.fn(),
  };

  const service = new NotificationsService(
    {} as any,
    messageRepository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { normalizeHtmlBody: jest.fn((value) => value), toBodyText: jest.fn((value) => value) } as any,
    recipientResolver as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  return { service, recipientResolver };
};

describe('NotificationsService system messages', () => {
  const userId = '7dc2492a-6613-46db-8339-d213d5ea6dda';
  const parentMessageId = 'a07978de-bf9c-4521-984a-85d4dc54b117';

  it('blocks replies to system messages before resolving recipients', async () => {
    const { service, recipientResolver } = createNotificationsService({
      id: parentMessageId,
      kind: 'SYSTEM_MESSAGE',
      senderType: 'SYSTEM',
      originModule: 'system',
    });

    await expect(
      service.replyMessage({
        senderUserId: userId,
        parentMessageId,
        bodyHtml: '<p>ok</p>',
      }),
    ).rejects.toThrow(new BadRequestException('SYSTEM_MESSAGE_NOT_REPLYABLE'));
    expect(recipientResolver.resolveReplyRecipientsOrFail).not.toHaveBeenCalled();
  });

  it('blocks forwards to system notifications before resolving recipients', async () => {
    const { service, recipientResolver } = createNotificationsService({
      id: parentMessageId,
      kind: 'SYSTEM_NOTIFICATION',
      senderType: 'SYSTEM',
      originModule: 'purchases',
    });

    await expect(
      service.forwardMessage({
        senderUserId: userId,
        parentMessageId,
        bodyHtml: '<p>ok</p>',
        to: ['admin@example.com'],
      }),
    ).rejects.toThrow(new BadRequestException('SYSTEM_MESSAGE_NOT_REPLYABLE'));
    expect(recipientResolver.resolveRecipientsByBucketsOrFail).not.toHaveBeenCalled();
  });
});

describe('NotificationsService forward preview', () => {
  const userId = '7dc2492a-6613-46db-8339-d213d5ea6dda';
  const parentMessageId = 'a07978de-bf9c-4521-984a-85d4dc54b117';

  it('stores forwarded message metadata without injecting the parent body into the sent body', async () => {
    const parent = {
      id: parentMessageId,
      kind: 'USER_MESSAGE',
      senderType: 'USER',
      senderUserId: 'parent-user-id',
      originModule: 'corporate',
      sourceEntityType: null,
      sourceEntityId: null,
      subject: 'Reporte original',
      bodyHtml: '<p>Contenido original privado</p>',
      bodyText: 'Contenido original privado',
      sentAt: new Date('2026-05-20T10:00:00.000Z'),
      createdAt: new Date('2026-05-20T09:59:00.000Z'),
    };
    let savedMessage: Record<string, unknown> | null = null;

    const messageRepository = {
      findOne: jest.fn().mockResolvedValue(parent),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: parent.senderUserId,
        name: 'Santiago',
        email: 'santiago@example.com',
      }),
    };
    const recipientResolver = {
      resolveRecipientsByBucketsOrFail: jest.fn().mockResolvedValue({
        recipients: [
          {
            id: 'recipient-user-id',
            email: 'admin@example.com',
            name: 'Admin',
            relationType: 'TO',
          },
        ],
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback: (manager: { getRepository: (entity: unknown) => unknown }) => Promise<unknown>) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === MessageThread) {
              return {
                create: jest.fn((value) => value),
                save: jest.fn(async (value) => ({ ...value, id: 'thread-forward-id' })),
              };
            }
            if (entity === MessageEntity) {
              return {
                create: jest.fn((value) => value),
                save: jest.fn(async (value) => {
                  savedMessage = { ...value, id: 'message-forward-id' };
                  return savedMessage;
                }),
              };
            }
            if (entity === MessageRecipientEntity) {
              return {
                create: jest.fn((value) => value),
                save: jest.fn(async (value) => value),
              };
            }
            throw new Error('UNEXPECTED_REPOSITORY');
          },
        }) as Promise<unknown>,
      ),
    };

    const service = new NotificationsService(
      userRepository as any,
      messageRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { linkAttachmentsToMessage: jest.fn() } as any,
      {} as any,
      {
        normalizeHtmlBody: jest.fn((value) => value),
        toBodyText: jest.fn((value) => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()),
      } as any,
      recipientResolver as any,
      { createAuditLog: jest.fn() } as any,
      { createMessageUserStates: jest.fn() } as any,
      { emitMessageCreatedToRecipients: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      { ensureAttachmentRefsForUsers: jest.fn() } as any,
    ) as any;

    service.ensureCanOpenMessageOrThrow = jest.fn();
    service.ensureCanAccessModule = jest.fn();

    await service.forwardMessage({
      senderUserId: userId,
      parentMessageId,
      bodyHtml: '<p>Por favor revisar.</p>',
      to: ['admin@example.com'],
    });

    expect(savedMessage?.bodyHtml).toBe('<p>Por favor revisar.</p>');
    expect(String(savedMessage?.bodyHtml)).not.toContain('Contenido original privado');
    expect(savedMessage?.bodyJson).toEqual({
      forwardedMessage: {
        id: parentMessageId,
        subject: 'Reporte original',
        senderName: 'Santiago',
        senderEmail: 'santiago@example.com',
        sentAt: '2026-05-20T10:00:00.000Z',
        bodyPreview: 'Contenido original privado',
        attachmentSummary: [],
      },
    });
  });
});

describe('NotificationsService replies', () => {
  const userId = '7dc2492a-6613-46db-8339-d213d5ea6dda';
  const parentMessageId = 'a07978de-bf9c-4521-984a-85d4dc54b117';

  it('stores reply with the original conversation subject without Re prefix', async () => {
    const parent = {
      id: parentMessageId,
      kind: 'USER_MESSAGE',
      senderType: 'USER',
      senderUserId: 'parent-user-id',
      originModule: 'corporate',
      sourceEntityType: null,
      sourceEntityId: null,
      threadId: 'thread-1',
      subject: 'Re: Reporte original',
      bodyHtml: '<p>Original</p>',
      bodyText: 'Original',
      sentAt: new Date('2026-05-20T10:00:00.000Z'),
      createdAt: new Date('2026-05-20T09:59:00.000Z'),
    };
    let savedMessage: Record<string, unknown> | null = null;

    const messageRepository = {
      findOne: jest.fn().mockResolvedValue(parent),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: parent.senderUserId,
        name: 'Santiago',
        email: 'santiago@example.com',
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback: (manager: { getRepository: (entity: unknown) => unknown }) => Promise<unknown>) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === MessageThread) {
              return { update: jest.fn() };
            }
            if (entity === MessageEntity) {
              return {
                create: jest.fn((value) => value),
                save: jest.fn(async (value) => {
                  savedMessage = { ...value, id: 'message-reply-id' };
                  return savedMessage;
                }),
              };
            }
            if (entity === MessageRecipientEntity) {
              return {
                create: jest.fn((value) => value),
                save: jest.fn(async (value) => value),
              };
            }
            throw new Error('UNEXPECTED_REPOSITORY');
          },
        }) as Promise<unknown>,
      ),
    };

    const service = new NotificationsService(
      userRepository as any,
      messageRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { linkAttachmentsToMessage: jest.fn() } as any,
      {} as any,
      { normalizeHtmlBody: jest.fn((value) => value), toBodyText: jest.fn((value) => value) } as any,
      { hasAnyRecipient: jest.fn(() => false) } as any,
      { createAuditLog: jest.fn() } as any,
      { createMessageUserStates: jest.fn() } as any,
      { emitMessageCreatedToRecipients: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      { ensureAttachmentRefsForUsers: jest.fn() } as any,
    ) as any;

    service.ensureCanOpenMessageOrThrow = jest.fn();
    service.ensureCanAccessModule = jest.fn();

    await service.replyMessage({
      senderUserId: userId,
      parentMessageId,
      bodyHtml: '<p>Respuesta</p>',
    });

    expect(savedMessage?.subject).toBe('Reporte original');
  });
});

describe('NotificationsService drafts', () => {
  const userId = '7dc2492a-6613-46db-8339-d213d5ea6dda';

  const createDraftService = (overrides: {
    messageRepository?: Record<string, unknown>;
    messageThreadRepository?: Record<string, unknown>;
    messageContentService?: Record<string, unknown>;
    messageAuditService?: Record<string, unknown>;
  } = {}) => {
    const messageRepository = overrides.messageRepository ?? {
      findOne: jest.fn(),
      save: jest.fn((value) => Promise.resolve(value)),
      create: jest.fn((value) => value),
    };
    const messageThreadRepository = overrides.messageThreadRepository ?? {
      save: jest.fn((value) => Promise.resolve({ ...value, id: 'thread-1' })),
      create: jest.fn((value) => value),
    };
    const messageContentService = overrides.messageContentService ?? {
      normalizeHtmlBody: jest.fn((value) => value),
      toBodyText: jest.fn((value) => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()),
    };
    const messageAuditService = overrides.messageAuditService ?? {
      createAuditLog: jest.fn(),
    };

    const service = new NotificationsService(
      {} as any,
      messageRepository as any,
      {} as any,
      messageThreadRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { ensureCanAccessModule: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      messageContentService as any,
      {} as any,
      messageAuditService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, messageRepository, messageThreadRepository };
  };

  it('rejects creating an empty draft unless it is reserved for an attachment upload', async () => {
    const { service, messageThreadRepository } = createDraftService();

    await expect(
      service.createDraft({
        userId,
        recipients: '',
        subject: '',
        bodyHtml: '<p></p>',
        bodyJson: {},
        originModule: 'corporate',
      }),
    ).rejects.toThrow(new BadRequestException('EMPTY_DRAFT_NOT_ALLOWED'));

    expect((messageThreadRepository.save as jest.Mock)).not.toHaveBeenCalled();
  });

  it('replaces controlled draft metadata instead of keeping stale attachment and label ids', async () => {
    const draft = {
      id: 'draft-1',
      createdByUserId: userId,
      isDraft: true,
      status: 'DRAFT',
      subject: 'Viejo',
      bodyHtml: '<p>Viejo</p>',
      bodyText: 'Viejo',
      bodyJson: {
        custom: 'keep',
        draftRecipients: 'old@example.com',
        draftAttachmentIds: ['old-att'],
        draftSelectedLabelIds: ['old-label'],
        draftPendingAttachment: true,
      },
      draftExpiresAt: new Date(Date.now() + 60_000),
      threadId: 'thread-1',
    };
    const messageRepository = {
      findOne: jest.fn().mockResolvedValue(draft),
      save: jest.fn(async (value) => value),
    };
    const { service } = createDraftService({ messageRepository });

    const result = await service.updateDraft({
      userId,
      draftId: 'draft-1',
      recipients: 'new@example.com',
      subject: 'Nuevo',
      bodyHtml: '<p>Nuevo</p>',
      bodyJson: {
        draftAttachmentIds: ['new-att'],
        draftSelectedLabelIds: [],
      },
    });

    expect(result.draft.bodyJson).toMatchObject({
      custom: 'keep',
      draftRecipients: 'new@example.com',
      draftAttachmentIds: ['new-att'],
      draftSelectedLabelIds: [],
    });
    expect((result.draft.bodyJson as Record<string, unknown>).draftPendingAttachment).toBeUndefined();
    expect((result.draft.bodyJson as Record<string, unknown>).draftAttachmentIds).not.toContain('old-att');
  });
});

describe('NotificationsService module label configs', () => {
  const createServiceForModuleConfig = () => {
    const messageLabelRepository = {
      findOne: jest.fn(),
    };
    const notificationModuleLabelConfigRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((value) => value),
    };

    const service = new NotificationsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      messageLabelRepository as any,
      {} as any,
      {} as any,
      {} as any,
      notificationModuleLabelConfigRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, messageLabelRepository, notificationModuleLabelConfigRepository };
  };

  it('does not persist when module label config remains unchanged', async () => {
    const { service, messageLabelRepository, notificationModuleLabelConfigRepository } =
      createServiceForModuleConfig();

    messageLabelRepository.findOne.mockResolvedValue({ id: 'label-1' });
    notificationModuleLabelConfigRepository.findOne.mockResolvedValue({
      id: 'config-1',
      moduleKey: 'warehouse',
      labelId: 'label-1',
      updatedByUserId: 'user-prev',
      updatedAt: new Date('2026-05-26T10:00:00.000Z'),
    });

    const result = await service.upsertModuleLabelConfig('user-1', 'warehouse', 'label-1');

    expect(notificationModuleLabelConfigRepository.save).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'config-1',
      moduleKey: 'warehouse',
      labelId: 'label-1',
    });
  });
});
