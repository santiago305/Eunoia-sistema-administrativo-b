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
      {} as any,
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
      {} as any,
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
