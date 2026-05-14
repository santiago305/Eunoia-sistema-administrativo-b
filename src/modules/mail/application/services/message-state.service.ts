import { Injectable } from '@nestjs/common';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';

@Injectable()
export class MessageStateService {
  markRead(state: MessageUserStateEntity, now = new Date()) {
    state.readAt = state.readAt ?? now;
    state.openedAt = state.openedAt ?? now;
    return state;
  }

  markUnread(state: MessageUserStateEntity) {
    state.readAt = null;
    return state;
  }

  moveToTrash(state: MessageUserStateEntity, now = new Date()) {
    state.deletedAt = now;
    state.trashExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    state.isArchived = false;
    state.isInInbox = false;
    return state;
  }

  restoreFromTrash(state: MessageUserStateEntity) {
    state.deletedAt = null;
    state.trashExpiresAt = null;
    state.permanentlyHiddenAt = null;
    state.isInInbox = state.relationType !== 'SENDER';
    return state;
  }

  archive(state: MessageUserStateEntity) {
    state.isArchived = true;
    state.isInInbox = false;
    return state;
  }

  unarchive(state: MessageUserStateEntity) {
    state.isArchived = false;
    if (state.relationType !== 'SENDER') state.isInInbox = true;
    return state;
  }

  snooze(state: MessageUserStateEntity, snoozedUntil: Date, now = new Date()) {
    state.snoozedUntil = snoozedUntil;
    state.snoozedAt = now;
    state.isInInbox = false;
    return state;
  }

  unsnooze(state: MessageUserStateEntity) {
    state.snoozedUntil = null;
    state.snoozedAt = null;
    if (state.relationType !== 'SENDER') state.isInInbox = true;
    return state;
  }
}
