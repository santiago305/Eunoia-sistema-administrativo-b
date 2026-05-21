import { SystemNotificationService } from './system-notification.service';

const createRepository = () => ({
  create: jest.fn((value) => value),
  findBy: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(async (value) => value),
});

describe('SystemNotificationService grouped threads', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const purchaseId = '22222222-2222-4222-8222-222222222222';

  it('adds consecutive system notifications for the same entity to the existing thread', async () => {
    const usersRepository = createRepository();
    const threadRepository = createRepository();
    const messageRepository = createRepository();
    const stateRepository = createRepository();
    const moduleLabelConfigRepository = createRepository();

    const existingThread = {
      id: '33333333-3333-4333-8333-333333333333',
      subject: 'Compra creada',
      originModule: 'purchases',
      sourceEntityType: 'purchase_order',
      sourceEntityId: purchaseId,
      lastMessageAt: new Date('2026-05-20T09:00:00.000Z'),
    };
    const latestMessage = {
      id: '44444444-4444-4444-8444-444444444444',
      threadId: existingThread.id,
      sentAt: new Date('2026-05-20T09:00:00.000Z'),
      createdAt: new Date('2026-05-20T09:00:00.000Z'),
    };

    usersRepository.findBy.mockResolvedValue([{ id: userId, email: 'admin@example.com' }]);
    threadRepository.findOne.mockResolvedValue(existingThread);
    messageRepository.findOne.mockResolvedValue(latestMessage);
    messageRepository.save.mockImplementation(async (value) => ({ id: '55555555-5555-4555-8555-555555555555', ...value }));
    stateRepository.save.mockImplementation(async (values) =>
      values.map((value: Record<string, unknown>) => ({ id: '66666666-6666-4666-8666-666666666666', ...value })),
    );
    moduleLabelConfigRepository.findOne.mockResolvedValue(null);

    const service = new SystemNotificationService(
      usersRepository as any,
      threadRepository as any,
      messageRepository as any,
      stateRepository as any,
      moduleLabelConfigRepository as any,
      { emitToUser: jest.fn() } as any,
      { toNotificationResponse: jest.fn(() => ({ notification: {} })) } as any,
      { createAuditLog: jest.fn() } as any,
      { assignLabelsToState: jest.fn() } as any,
      { createActionsForSystemMessage: jest.fn() } as any,
    );

    await service.createNotificationForUsers({
      recipientUserIds: [userId],
      type: 'PURCHASE_REQUIRES_VERIFICATION',
      category: 'PURCHASES',
      title: 'Requiere verificacion',
      message: 'La compra requiere verificacion',
      sourceModule: 'purchases',
      sourceEntityType: 'purchase_order',
      sourceEntityId: purchaseId,
    });

    expect(threadRepository.findOne).toHaveBeenCalledWith({
      where: {
        originModule: 'purchases',
        sourceEntityType: 'purchase_order',
        sourceEntityId: purchaseId,
      },
    });
    expect(messageRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: existingThread.id,
        parentMessageId: latestMessage.id,
      }),
    );
  });
});
