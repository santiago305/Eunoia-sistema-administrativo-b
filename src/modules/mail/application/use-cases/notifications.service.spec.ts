import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

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
