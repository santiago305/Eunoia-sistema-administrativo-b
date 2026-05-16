import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageLabelAssignmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-label-assignment.entity';
import { MessageLabelEntity } from '../../adapters/out/persistence/typeorm/entities/message-label.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { NotificationLabelsService } from './notification-labels.service';

@Injectable()
export class NotificationQueriesService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(MessageLabelAssignmentEntity)
    private readonly messageLabelAssignmentRepository: Repository<MessageLabelAssignmentEntity>,
    @InjectRepository(MessageLabelEntity)
    private readonly messageLabelRepository: Repository<MessageLabelEntity>,
    private readonly labelsService: NotificationLabelsService,
  ) {}

  async countMessages(
    userId: string,
    query: {
      view?: 'inbox' | 'sent' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'drafts' | 'all';
      originModule?: string;
      read?: boolean;
      hasAttachments?: boolean;
      labelId?: string;
    },
  ) {
    const view = query.view ?? 'inbox';

    if (view === 'drafts') {
      const total = await this.messageRepository.count({
        where: { createdByUserId: userId, isDraft: true, status: 'DRAFT' },
      });
      return { total };
    }

    const qb = this.messageUserStateRepository
      .createQueryBuilder('mus')
      .innerJoin(MessageEntity, 'm', 'm.id = mus.message_id')
      .where('mus.user_id = :userId', { userId })
      .andWhere('mus.permanently_hidden_at IS NULL');

    if (view === 'sent') {
      qb.andWhere('mus.is_in_sent = true')
        .andWhere('mus.deleted_at IS NULL')
        .andWhere('mus.is_archived = false')
        .andWhere('(mus.snoozed_until IS NULL OR mus.snoozed_until <= now())')
        .andWhere('m.is_draft = false');
    } else if (view !== 'all') {
      if (view === 'trash') qb.andWhere('mus.deleted_at IS NOT NULL');
      else qb.andWhere('mus.deleted_at IS NULL');
      if (view === 'archived') qb.andWhere('mus.is_archived = true');
      if (view !== 'archived') qb.andWhere('mus.is_archived = false');
      if (view === 'snoozed') qb.andWhere('mus.snoozed_until IS NOT NULL AND mus.snoozed_until > now()');
      if (view !== 'snoozed') qb.andWhere('(mus.snoozed_until IS NULL OR mus.snoozed_until <= now())');
      if (view === 'starred') qb.andWhere('mus.starred_at IS NOT NULL');
      if (view === 'inbox') qb.andWhere('mus.is_in_inbox = true');
    }

    if (query.labelId) {
      qb.innerJoin(
        MessageLabelAssignmentEntity,
        'mla',
        'mla.message_user_state_id = mus.id AND mla.label_id = :labelId AND mla.user_id = :userId',
        { labelId: query.labelId, userId },
      );
    }

    if (query.originModule) qb.andWhere('m.origin_module = :originModule', { originModule: query.originModule });
    if (typeof query.read === 'boolean') qb.andWhere(query.read ? 'mus.read_at IS NOT NULL' : 'mus.read_at IS NULL');
    if (typeof query.hasAttachments === 'boolean') {
      qb.andWhere(
        query.hasAttachments
          ? 'EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)'
          : 'NOT EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)',
      );
    }

    const total = await qb.getCount();
    return { total };
  }

  async countSidebarMessages(userId: string, labelIds: string[] = []) {
    const sidebarRaw = await this.messageUserStateRepository
      .createQueryBuilder('mus')
      .select('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = false AND (mus.snoozed_until IS NULL OR mus.snoozed_until <= now()) AND mus.is_in_inbox = true AND mus.read_at IS NULL), 0)', 'inbox')
      .addSelect('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = false AND (mus.snoozed_until IS NULL OR mus.snoozed_until <= now()) AND mus.starred_at IS NOT NULL AND mus.read_at IS NULL), 0)', 'starred')
      .addSelect('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NOT NULL AND mus.read_at IS NULL), 0)', 'trash')
      .addSelect('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = true AND mus.read_at IS NULL), 0)', 'archived')
      .addSelect('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = false AND mus.snoozed_until IS NOT NULL AND mus.snoozed_until > now() AND mus.read_at IS NULL), 0)', 'snoozed')
      .addSelect('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = false AND (mus.snoozed_until IS NULL OR mus.snoozed_until <= now()) AND mus.is_in_sent = true), 0)', 'sent')
      .where('mus.user_id = :userId', { userId })
      .andWhere('mus.permanently_hidden_at IS NULL')
      .getRawOne<{
        inbox: string;
        starred: string;
        trash: string;
        archived: string;
        snoozed: string;
        sent: string;
      }>();

    const drafts = await this.messageRepository.count({
      where: { createdByUserId: userId, isDraft: true, status: 'DRAFT' },
    });

    const uniqueLabelIds = Array.from(new Set((labelIds ?? []).filter(Boolean)));
    const labelUnreadById: Record<string, number> = {};
    if (uniqueLabelIds.length) {
      const labelRows = await this.messageLabelAssignmentRepository
        .createQueryBuilder('mla')
        .innerJoin(MessageUserStateEntity, 'mus', 'mus.id = mla.message_user_state_id')
        .select('mla.label_id', 'labelId')
        .addSelect('COUNT(*)', 'total')
        .where('mla.user_id = :userId', { userId })
        .andWhere('mla.label_id IN (:...labelIds)', { labelIds: uniqueLabelIds })
        .andWhere('mus.user_id = :userId', { userId })
        .andWhere('mus.permanently_hidden_at IS NULL')
        .andWhere('mus.deleted_at IS NULL')
        .andWhere('mus.is_archived = false')
        .andWhere('(mus.snoozed_until IS NULL OR mus.snoozed_until <= now())')
        .andWhere('mus.is_in_inbox = true')
        .andWhere('mus.read_at IS NULL')
        .groupBy('mla.label_id')
        .getRawMany<{ labelId: string; total: string }>();

      uniqueLabelIds.forEach((labelId) => {
        labelUnreadById[labelId] = 0;
      });
      labelRows.forEach((row) => {
        labelUnreadById[row.labelId] = Number(row.total ?? 0);
      });
    }

    return {
      inbox: Number(sidebarRaw?.inbox ?? 0),
      starred: Number(sidebarRaw?.starred ?? 0),
      sent: Number(sidebarRaw?.sent ?? 0),
      drafts,
      trash: Number(sidebarRaw?.trash ?? 0),
      archived: Number(sidebarRaw?.archived ?? 0),
      snoozed: Number(sidebarRaw?.snoozed ?? 0),
      labelUnreadById,
    };
  }

  async listMessages(
    userId: string,
    query: {
      view?: 'inbox' | 'sent' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'drafts' | 'all';
      originModule?: string;
      q?: string;
      page?: number;
      limit?: number;
      read?: boolean;
      hasAttachments?: boolean;
      labelId?: string;
    },
  ) {
    const view = query.view ?? 'inbox';
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);

    if (view === 'sent') {
      const qbSent = this.messageUserStateRepository
        .createQueryBuilder('mus')
        .innerJoin(MessageEntity, 'm', 'm.id = mus.message_id')
        .where('mus.user_id = :userId', { userId })
        .andWhere('mus.is_in_sent = true')
        .andWhere('mus.permanently_hidden_at IS NULL')
        .andWhere('mus.deleted_at IS NULL')
        .andWhere('mus.is_archived = false')
        .andWhere('(mus.snoozed_until IS NULL OR mus.snoozed_until <= now())')
        .andWhere('m.is_draft = false');

      if (query.labelId) {
        qbSent.innerJoin(
          MessageLabelAssignmentEntity,
          'mla',
          'mla.message_user_state_id = mus.id AND mla.label_id = :labelId AND mla.user_id = :userId',
          { labelId: query.labelId, userId },
        );
      }

      if (query.originModule) qbSent.andWhere('m.origin_module = :originModule', { originModule: query.originModule });
      if (query.q) {
        qbSent.andWhere(
          `(
            m.subject ILIKE :q
            OR m.body_text ILIKE :q
            OR EXISTS (
              SELECT 1
              FROM users su
              WHERE su.user_id = m.sender_user_id
                AND (su.name ILIKE :q OR su.email ILIKE :q)
            )
            OR EXISTS (
              SELECT 1
              FROM message_recipients mr
              WHERE mr.message_id = m.id
                AND mr.recipient_email ILIKE :q
            )
            OR EXISTS (
              SELECT 1
              FROM message_attachments ma
              WHERE ma.message_id = m.id
                AND ma.original_name ILIKE :q
            )
            OR EXISTS (
              SELECT 1
              FROM message_label_assignments mla2
              JOIN message_labels ml2 ON ml2.id = mla2.label_id
              WHERE mla2.message_user_state_id = mus.id
                AND (ml2.name ILIKE :q OR ml2.key ILIKE :q)
            )
            OR m.origin_module ILIKE :q
          )`,
          { q: `%${query.q}%` },
        );
        await this.labelsService.trackSearch(userId, query.q);
      }
      if (typeof query.read === 'boolean') qbSent.andWhere(query.read ? 'mus.read_at IS NOT NULL' : 'mus.read_at IS NULL');
      if (typeof query.hasAttachments === 'boolean') {
        qbSent.andWhere(query.hasAttachments ? 'EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)' : 'NOT EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)');
      }

      const total = await qbSent.clone().getCount();
      const rows = await qbSent
        .clone()
        .select(['m.id AS message_id'])
        .orderBy('m.sent_at', 'DESC')
        .addOrderBy('m.created_at', 'DESC')
        .limit(limit)
        .offset((page - 1) * limit)
        .getRawMany<{ message_id: string }>();
      const messageIds = rows.map((row) => row.message_id);
      const items = messageIds.length ? await this.messageRepository.find({ where: messageIds.map((id) => ({ id })) }) : [];
      return { page, limit, total, items };
    }

    if (view === 'drafts') {
      const [items, total] = await this.messageRepository.findAndCount({ where: { createdByUserId: userId, isDraft: true, status: 'DRAFT' }, order: { updatedAt: 'DESC' }, take: limit, skip: (page - 1) * limit });
      return { page, limit, total, items };
    }

    const qb = this.messageUserStateRepository
      .createQueryBuilder('mus')
      .innerJoin(MessageEntity, 'm', 'm.id = mus.message_id')
      .where('mus.user_id = :userId', { userId })
      .andWhere('mus.permanently_hidden_at IS NULL');

    if (query.labelId) qb.innerJoin(MessageLabelAssignmentEntity, 'mla', 'mla.message_user_state_id = mus.id AND mla.label_id = :labelId', { labelId: query.labelId });

    if (view !== 'all') {
      if (view === 'trash') qb.andWhere('mus.deleted_at IS NOT NULL');
      else qb.andWhere('mus.deleted_at IS NULL');
      if (view === 'archived') qb.andWhere('mus.is_archived = true');
      if (view !== 'archived') qb.andWhere('mus.is_archived = false');
      if (view === 'snoozed') qb.andWhere('mus.snoozed_until IS NOT NULL AND mus.snoozed_until > now()');
      if (view !== 'snoozed') qb.andWhere('(mus.snoozed_until IS NULL OR mus.snoozed_until <= now())');
      if (view === 'starred') qb.andWhere('mus.starred_at IS NOT NULL');
      if (view === 'inbox') qb.andWhere('mus.is_in_inbox = true');
    }

    if (query.originModule) qb.andWhere('m.origin_module = :originModule', { originModule: query.originModule });
    if (query.q) {
      qb.andWhere(
        `(
          m.subject ILIKE :q
          OR m.body_text ILIKE :q
          OR EXISTS (
            SELECT 1
            FROM users su
            WHERE su.user_id = m.sender_user_id
              AND (su.name ILIKE :q OR su.email ILIKE :q)
          )
          OR EXISTS (
            SELECT 1
            FROM message_recipients mr
            WHERE mr.message_id = m.id
              AND mr.recipient_email ILIKE :q
          )
          OR EXISTS (
            SELECT 1
            FROM message_attachments ma
            WHERE ma.message_id = m.id
              AND ma.original_name ILIKE :q
          )
          OR EXISTS (
            SELECT 1
            FROM message_label_assignments mla2
            JOIN message_labels ml2 ON ml2.id = mla2.label_id
            WHERE mla2.message_user_state_id = mus.id
              AND (ml2.name ILIKE :q OR ml2.key ILIKE :q)
          )
          OR m.origin_module ILIKE :q
        )`,
        { q: `%${query.q}%` },
      );
      await this.labelsService.trackSearch(userId, query.q);
    }
    if (typeof query.read === 'boolean') qb.andWhere(query.read ? 'mus.read_at IS NOT NULL' : 'mus.read_at IS NULL');
    if (typeof query.hasAttachments === 'boolean') {
      qb.andWhere(query.hasAttachments ? 'EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)' : 'NOT EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)');
    }

    qb.orderBy('m.sent_at', 'DESC').addOrderBy('m.created_at', 'DESC');

    const total = await qb.clone().getCount();
    const rows = await qb
      .clone()
      .select(['mus.id AS state_id', 'mus.message_id AS message_id'])
      .limit(limit)
      .offset((page - 1) * limit)
      .getRawMany<{ state_id: string; message_id: string }>();

    const stateIds = rows.map((row) => row.state_id);
    const messageIds = rows.map((row) => row.message_id);

    const states = stateIds.length ? await this.messageUserStateRepository.find({ where: stateIds.map((id) => ({ id })) }) : [];
    const messages = messageIds.length ? await this.messageRepository.find({ where: messageIds.map((id) => ({ id })) }) : [];
    const senderIds = Array.from(new Set(messages.map((m) => m.senderUserId).filter(Boolean))) as string[];
    const senders = senderIds.length ? await this.userRepository.find({ where: senderIds.map((id) => ({ id })), select: ['id', 'name', 'email'] }) : [];
    const senderMap = new Map(senders.map((sender) => [sender.id, sender]));

    const stateMap = new Map(states.map((state) => [state.id, state]));
    const messageMap = new Map(messages.map((message) => [message.id, message]));
    const labelAssignments = stateIds.length ? await this.messageLabelAssignmentRepository.find({ where: stateIds.map((id) => ({ messageUserStateId: id, userId })) }) : [];
    const labelIds = Array.from(new Set(labelAssignments.map((assignment) => assignment.labelId)));
    const labels = labelIds.length ? await this.messageLabelRepository.find({ where: labelIds.map((id) => ({ id })) }) : [];
    const labelMap = new Map(labels.map((label) => [label.id, label]));
    const labelsByState = new Map<string, MessageLabelEntity[]>();
    labelAssignments.forEach((assignment) => {
      const bucket = labelsByState.get(assignment.messageUserStateId) ?? [];
      const label = labelMap.get(assignment.labelId);
      if (label) bucket.push(label);
      labelsByState.set(assignment.messageUserStateId, bucket);
    });

    return {
      page,
      limit,
      total,
      items: rows
        .map((row) => ({
          recipient: (() => {
            const state = stateMap.get(row.state_id);
            if (!state) return null;
            return {
              id: state.id,
              messageId: state.messageId,
              recipientUserId: state.userId,
              recipientEmail: state.recipientEmail ?? '',
              recipientType: state.relationType === 'CC' ? 'CC' : state.relationType === 'BCC' ? 'BCC' : 'TO',
              readAt: state.readAt,
              starredAt: state.starredAt,
              deletedAt: state.deletedAt,
              deliveredAt: state.deliveredAt,
              createdAt: state.createdAt,
              updatedAt: state.updatedAt,
            };
          })(),
          message: messageMap.get(row.message_id) ?? null,
          labels: labelsByState.get(row.state_id) ?? [],
          sender: (() => {
            const msg = messageMap.get(row.message_id);
            if (!msg?.senderUserId) return null;
            const sender = senderMap.get(msg.senderUserId);
            if (!sender) return null;
            return { id: sender.id, name: sender.name, email: sender.email };
          })(),
        }))
        .filter((item) => item.recipient !== null),
    };
  }
}
