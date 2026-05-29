import { MessageRealtimeEventsService } from './message-realtime-events.service';

describe('MessageRealtimeEventsService', () => {
  it('emits sender avatarUrl in message.created payloads', async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sender-1',
        name: 'Santiago',
        email: 'santiago@example.com',
        avatarUrl: '/uploads/santiago.png',
      }),
    };
    const messageUserStateRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'state-1',
          messageId: 'message-1',
          userId: 'recipient-1',
          recipientEmail: 'admin@example.com',
          relationType: 'TO',
          readAt: null,
          starredAt: null,
          deletedAt: null,
          deliveredAt: null,
          createdAt: new Date('2026-05-20T10:00:00.000Z'),
          updatedAt: new Date('2026-05-20T10:00:00.000Z'),
          isArchived: false,
          isInInbox: true,
          snoozedUntil: null,
        },
      ]),
    };
    const messageLabelAssignmentRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    const messageLabelRepository = {
      find: jest.fn(),
    };
    const realtimeService = {
      emitToUser: jest.fn(),
    };
    const service = new MessageRealtimeEventsService(
      userRepository as any,
      messageUserStateRepository as any,
      messageLabelAssignmentRepository as any,
      messageLabelRepository as any,
      realtimeService as any,
    );

    await service.emitMessageCreatedToRecipients(
      'sender-1',
      {
        id: 'message-1',
        threadId: 'thread-1',
        parentMessageId: null,
        kind: 'USER_MESSAGE',
        originModule: 'corporate',
        senderType: 'USER',
        senderUserId: 'sender-1',
        createdByUserId: 'sender-1',
        subject: 'Reporte',
        bodyHtml: '<p>Hola</p>',
        bodyText: 'Hola',
        bodyJson: null,
        sourceEntityType: null,
        sourceEntityId: null,
        status: 'SENT',
        isDraft: false,
        sentAt: new Date('2026-05-20T10:00:00.000Z'),
        createdAt: new Date('2026-05-20T10:00:00.000Z'),
        updatedAt: new Date('2026-05-20T10:00:00.000Z'),
      } as any,
      [
        {
          id: 'recipient-row-1',
          messageId: 'message-1',
          recipientUserId: 'recipient-1',
          recipientEmail: 'admin@example.com',
          recipientType: 'TO',
          deliveredAt: null,
        } as any,
      ],
    );

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'sender-1' },
      select: ['id', 'name', 'email', 'avatarUrl'],
    });
    expect(realtimeService.emitToUser).toHaveBeenCalledWith(
      'recipient-1',
      'message.created',
      expect.objectContaining({
        sender: expect.objectContaining({
          id: 'sender-1',
          avatarUrl: '/uploads/santiago.png',
        }),
      }),
    );
  });
});
