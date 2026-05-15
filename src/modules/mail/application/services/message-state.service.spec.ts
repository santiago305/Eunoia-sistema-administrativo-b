import { MessageStateService } from './message-state.service';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';

describe('MessageStateService', () => {
  const service = new MessageStateService();

  const buildState = (relationType: MessageUserStateEntity['relationType'] = 'TO'): MessageUserStateEntity => ({
    id: 'state-1',
    messageId: 'msg-1',
    threadId: 'thread-1',
    userId: 'user-1',
    relationType,
    recipientEmail: 'user@test.com',
    isInInbox: true,
    isInSent: false,
    isArchived: false,
    isMuted: false,
    readAt: null,
    starredAt: null,
    snoozedUntil: null,
    snoozedAt: null,
    deletedAt: null,
    trashExpiresAt: null,
    permanentlyHiddenAt: null,
    deliveredAt: null,
    openedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('moves a message to trash with 30-day expiration', () => {
    const now = new Date('2026-05-15T10:00:00.000Z');
    const state = buildState();

    service.moveToTrash(state, now);

    expect(state.deletedAt).toEqual(now);
    expect(state.trashExpiresAt?.toISOString()).toBe('2026-06-14T10:00:00.000Z');
    expect(state.isArchived).toBe(false);
    expect(state.isInInbox).toBe(false);
  });

  it('restores inbox visibility for recipient but not for sender', () => {
    const recipient = buildState('TO');
    recipient.deletedAt = new Date();
    recipient.trashExpiresAt = new Date();

    service.restoreFromTrash(recipient);
    expect(recipient.deletedAt).toBeNull();
    expect(recipient.trashExpiresAt).toBeNull();
    expect(recipient.isInInbox).toBe(true);

    const sender = buildState('SENDER');
    sender.deletedAt = new Date();
    sender.trashExpiresAt = new Date();

    service.restoreFromTrash(sender);
    expect(sender.isInInbox).toBe(false);
  });

  it('unsnooze restores inbox for recipient but not sender', () => {
    const recipient = buildState('TO');
    recipient.snoozedUntil = new Date();
    recipient.snoozedAt = new Date();

    service.unsnooze(recipient);
    expect(recipient.snoozedUntil).toBeNull();
    expect(recipient.snoozedAt).toBeNull();
    expect(recipient.isInInbox).toBe(true);

    const sender = buildState('SENDER');
    sender.snoozedUntil = new Date();
    sender.snoozedAt = new Date();

    service.unsnooze(sender);
    expect(sender.isInInbox).toBe(false);
  });
});
