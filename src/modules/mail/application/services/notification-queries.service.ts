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

  private stateViewCondition(
    stateAlias: string,
    messageAlias: string,
    view: 'inbox' | 'sent' | 'scheduled' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'all',
  ) {
    const parts = [`${stateAlias}.permanently_hidden_at IS NULL`];
    if (view !== 'all') {
      if (view === 'trash') parts.push(`${stateAlias}.deleted_at IS NOT NULL`);
      else parts.push(`${stateAlias}.deleted_at IS NULL`);
      if (view === 'sent') parts.push(`${stateAlias}.is_in_sent = true`);
      if (view === 'archived') parts.push(`${stateAlias}.is_archived = true`);
      if (view !== 'archived') parts.push(`${stateAlias}.is_archived = false`);
      if (view === 'snoozed') parts.push(`${stateAlias}.snoozed_until IS NOT NULL AND ${stateAlias}.snoozed_until > now()`);
      if (view !== 'snoozed') parts.push(`(${stateAlias}.snoozed_until IS NULL OR ${stateAlias}.snoozed_until <= now())`);
      if (view === 'starred') parts.push(`${stateAlias}.starred_at IS NOT NULL`);
      if (view === 'inbox') parts.push(`${stateAlias}.is_in_inbox = true`);
    }
    parts.push(`${messageAlias}.is_draft = false`);
    return parts.join(' AND ');
  }

  private applyThreadAnchorFilter<T extends { andWhere: (...args: any[]) => T }>(
    qb: T,
    view: 'inbox' | 'sent' | 'scheduled' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'all',
  ): T {
    const newerStateCondition = this.stateViewCondition('newer_mus', 'newer_m', view);
    return qb.andWhere(`
      NOT EXISTS (
        SELECT 1
        FROM message_user_states newer_mus
        INNER JOIN messages newer_m ON newer_m.id = newer_mus.message_id
        WHERE newer_mus.user_id = mus.user_id
          AND newer_mus.thread_id = mus.thread_id
          AND ${newerStateCondition}
          AND (
            COALESCE(newer_m.sent_at, newer_m.created_at) > COALESCE(m.sent_at, m.created_at)
            OR (
              COALESCE(newer_m.sent_at, newer_m.created_at) = COALESCE(m.sent_at, m.created_at)
              AND newer_m.id > m.id
            )
          )
      )
    `);
  }

  private latestVisibleThreadMessageIdExpression() {
    return `
      COALESCE((
        SELECT latest_m.id
        FROM messages latest_m
        INNER JOIN message_user_states latest_mus
          ON latest_mus.message_id = latest_m.id
          AND latest_mus.user_id = mus.user_id
          AND latest_mus.permanently_hidden_at IS NULL
        WHERE latest_m.thread_id = m.thread_id
          AND latest_m.is_draft = false
        ORDER BY COALESCE(latest_m.sent_at, latest_m.created_at) DESC, latest_m.id DESC
        LIMIT 1
      ), m.id)
    `;
  }

  private latestVisibleThreadMessageDateExpression() {
    return `
      COALESCE((
        SELECT COALESCE(latest_m.sent_at, latest_m.created_at)
        FROM messages latest_m
        INNER JOIN message_user_states latest_mus
          ON latest_mus.message_id = latest_m.id
          AND latest_mus.user_id = mus.user_id
          AND latest_mus.permanently_hidden_at IS NULL
        WHERE latest_m.thread_id = m.thread_id
          AND latest_m.is_draft = false
        ORDER BY COALESCE(latest_m.sent_at, latest_m.created_at) DESC, latest_m.id DESC
        LIMIT 1
      ), COALESCE(m.sent_at, m.created_at))
    `;
  }

  private threadUnreadVisibilityCondition(
    stateAlias: string,
    messageAlias: string,
    view: 'inbox' | 'sent' | 'scheduled' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'all',
  ) {
    if (view === 'sent' || view === 'all') {
      return `${stateAlias}.permanently_hidden_at IS NULL AND ${messageAlias}.is_draft = false`;
    }
    return this.stateViewCondition(stateAlias, messageAlias, view);
  }

  private async getThreadUnreadCountMap(
    userId: string,
    threadIds: string[],
    view: 'inbox' | 'sent' | 'scheduled' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'all',
  ) {
    const uniqueThreadIds = Array.from(new Set(threadIds.filter(Boolean)));
    if (!uniqueThreadIds.length) return new Map<string, number>();
    const rows = await this.messageRepository
      .createQueryBuilder('m')
      .select('m.thread_id', 'threadId')
      .addSelect('COUNT(*)', 'total')
      .innerJoin(MessageUserStateEntity, 'mus_unread', 'mus_unread.message_id = m.id AND mus_unread.user_id = :userId', { userId })
      .where('m.thread_id IN (:...threadIds)', { threadIds: uniqueThreadIds })
      .andWhere('mus_unread.read_at IS NULL')
      .andWhere(this.threadUnreadVisibilityCondition('mus_unread', 'm', view))
      .groupBy('m.thread_id')
      .getRawMany<{ threadId: string; total: string }>();
    return new Map(rows.map((row) => [row.threadId, Number(row.total ?? 0)]));
  }

  async countMessages(
    userId: string,
    query: {
      view?: 'inbox' | 'sent' | 'scheduled' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'drafts' | 'all';
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

    if (view === 'scheduled') {
      const where: Partial<MessageEntity> = {
        createdByUserId: userId,
        isDraft: false,
        status: 'SCHEDULED',
      };
      if (query.originModule) where.originModule = query.originModule;
      const total = await this.messageRepository.count({
        where,
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
    this.applyThreadAnchorFilter(qb, view);

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
      .innerJoin(MessageEntity, 'm', 'm.id = mus.message_id')
      .select('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = false AND (mus.snoozed_until IS NULL OR mus.snoozed_until <= now()) AND mus.is_in_inbox = true AND mus.read_at IS NULL), 0)', 'inbox')
      .addSelect('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = false AND (mus.snoozed_until IS NULL OR mus.snoozed_until <= now()) AND mus.starred_at IS NOT NULL AND mus.read_at IS NULL), 0)', 'starred')
      .addSelect('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NOT NULL AND mus.read_at IS NULL), 0)', 'trash')
      .addSelect('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = true AND mus.read_at IS NULL), 0)', 'archived')
      .addSelect('COALESCE(COUNT(*) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = false AND mus.snoozed_until IS NOT NULL AND mus.snoozed_until > now() AND mus.read_at IS NULL), 0)', 'snoozed')
      .addSelect('COALESCE(COUNT(DISTINCT COALESCE(m.thread_id, m.id)) FILTER (WHERE mus.deleted_at IS NULL AND mus.is_archived = false AND (mus.snoozed_until IS NULL OR mus.snoozed_until <= now()) AND mus.is_in_sent = true AND m.is_draft = false), 0)', 'sent')
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
    const scheduled = await this.messageRepository.count({
      where: { createdByUserId: userId, isDraft: false, status: 'SCHEDULED' },
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
      scheduled,
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
      view?: 'inbox' | 'sent' | 'scheduled' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'drafts' | 'all';
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
      this.applyThreadAnchorFilter(qbSent, 'sent');

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
      const threadIds = Array.from(new Set(items.map((message) => message.threadId).filter(Boolean))) as string[];
      const threadUnreadCountMap = await this.getThreadUnreadCountMap(userId, threadIds, 'sent');
      const itemsWithThreadCounts = items.map((message) => ({
        ...message,
        threadUnreadCount: message.threadId ? threadUnreadCountMap.get(message.threadId) ?? 0 : 0,
      }));
      return { page, limit, total, items: itemsWithThreadCounts };
    }

    if (view === 'drafts') {
      const [items, total] = await this.messageRepository.findAndCount({ where: { createdByUserId: userId, isDraft: true, status: 'DRAFT' }, order: { updatedAt: 'DESC' }, take: limit, skip: (page - 1) * limit });
      return { page, limit, total, items };
    }

    if (view === 'scheduled') {
      const scheduledQb = this.messageRepository
        .createQueryBuilder('m')
        .where('m.created_by_user_id = :userId', { userId })
        .andWhere("m.status = 'SCHEDULED'")
        .andWhere('m.is_draft = false');

      if (query.originModule) scheduledQb.andWhere('m.origin_module = :originModule', { originModule: query.originModule });
      if (query.q) {
        scheduledQb.andWhere(
          `(
            m.subject ILIKE :q
            OR m.body_text ILIKE :q
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
            OR m.origin_module ILIKE :q
          )`,
          { q: `%${query.q}%` },
        );
        await this.labelsService.trackSearch(userId, query.q);
      }
      if (typeof query.hasAttachments === 'boolean') {
        scheduledQb.andWhere(
          query.hasAttachments
            ? 'EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)'
            : 'NOT EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)',
        );
      }

      const total = await scheduledQb.clone().getCount();
      const items = await scheduledQb
        .clone()
        .orderBy('m.scheduled_at', 'ASC')
        .addOrderBy('m.created_at', 'DESC')
        .take(limit)
        .skip((page - 1) * limit)
        .getMany();

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
    this.applyThreadAnchorFilter(qb, view);

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

    const latestMessageIdExpression = this.latestVisibleThreadMessageIdExpression();
    const latestMessageDateExpression = this.latestVisibleThreadMessageDateExpression();
    qb.orderBy(latestMessageDateExpression, 'DESC').addOrderBy('m.created_at', 'DESC');

    const total = await qb.clone().getCount();
    const rows = await qb
      .clone()
      .select(['mus.id AS state_id', `${latestMessageIdExpression} AS message_id`])
      .limit(limit)
      .offset((page - 1) * limit)
      .getRawMany<{ state_id: string; message_id: string }>();

    const stateIds = rows.map((row) => row.state_id);
    const messageIds = rows.map((row) => row.message_id);

    const states = stateIds.length ? await this.messageUserStateRepository.find({ where: stateIds.map((id) => ({ id })) }) : [];
    const messages = messageIds.length ? await this.messageRepository.find({ where: messageIds.map((id) => ({ id })) }) : [];
    const groupedSystemThreadIds = Array.from(
      new Set(
        messages
          .filter((message) => message.senderType === 'SYSTEM' && message.sourceEntityType && message.sourceEntityId && message.threadId)
          .map((message) => message.threadId!),
      ),
    );
    const threadCountRows = groupedSystemThreadIds.length
      ? await this.messageRepository
          .createQueryBuilder('m')
          .select('m.thread_id', 'threadId')
          .addSelect('COUNT(*)', 'total')
          .innerJoin(MessageUserStateEntity, 'mus_count', 'mus_count.message_id = m.id AND mus_count.user_id = :userId', { userId })
          .where('m.thread_id IN (:...threadIds)', { threadIds: groupedSystemThreadIds })
          .andWhere(this.stateViewCondition('mus_count', 'm', view))
          .groupBy('m.thread_id')
          .getRawMany<{ threadId: string; total: string }>()
      : [];
    const threadCountMap = new Map(threadCountRows.map((row) => [row.threadId, Number(row.total ?? 0)]));
    const threadIds = Array.from(new Set(messages.map((message) => message.threadId).filter(Boolean))) as string[];
    const threadUnreadCountMap = await this.getThreadUnreadCountMap(userId, threadIds, view);
    const senderIds = Array.from(new Set(messages.map((m) => m.senderUserId).filter(Boolean))) as string[];
    const senders = senderIds.length ? await this.userRepository.find({ where: senderIds.map((id) => ({ id })), select: ['id', 'name', 'email', 'avatarUrl'] }) : [];
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
          message: (() => {
            const msg = messageMap.get(row.message_id);
            if (!msg) return null;
            const state = stateMap.get(row.state_id);
            const threadMessageCount = msg.threadId ? threadCountMap.get(msg.threadId) ?? null : null;
            const threadUnreadCount = msg.threadId
              ? threadUnreadCountMap.get(msg.threadId) ?? 0
              : state?.readAt ? 0 : 1;
            if (!threadMessageCount && !threadUnreadCount) return msg;
            return {
              ...msg,
              latestMessageId: msg.id,
              threadMessageCount: threadMessageCount ?? undefined,
              threadLatestIndex: threadMessageCount ?? undefined,
              threadLabel: threadMessageCount ? `Sistema ${threadMessageCount} de ${threadMessageCount} mensajes` : null,
              threadUnreadCount,
            };
          })(),
          labels: labelsByState.get(row.state_id) ?? [],
          sender: (() => {
            const msg = messageMap.get(row.message_id);
            if (!msg?.senderUserId) return null;
            const sender = senderMap.get(msg.senderUserId);
            if (!sender) return null;
            return { id: sender.id, name: sender.name, email: sender.email, avatarUrl: sender.avatarUrl ?? null };
          })(),
        }))
        .filter((item) => item.recipient !== null),
    };
  }
}
