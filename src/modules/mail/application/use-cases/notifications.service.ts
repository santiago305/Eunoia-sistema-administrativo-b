import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { NotificationRecipient } from '../../adapters/out/persistence/typeorm/entities/notification-recipient.entity';
import { Notification } from '../../adapters/out/persistence/typeorm/entities/notification.entity';
import { NotificationRealtimeService } from '../../infrastructure/realtime/notification-realtime.service';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { NotificationOutbox } from '../../adapters/out/persistence/typeorm/entities/notification-outbox.entity';
import { NotificationDeliveryAttempt } from '../../adapters/out/persistence/typeorm/entities/notification-delivery-attempt.entity';
import { NotificationQueueService } from '../../infrastructure/queue/notification-queue.service';
import { NotificationPriority } from '../../adapters/out/persistence/typeorm/entities/notification.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageRecipientEntity } from '../../adapters/out/persistence/typeorm/entities/message-recipient.entity';
import { MessageThread } from '../../adapters/out/persistence/typeorm/entities/message-thread.entity';
import { AccessControlService } from 'src/modules/access-control/application/services/access-control.service';
import { MessageLabelEntity } from '../../adapters/out/persistence/typeorm/entities/message-label.entity';
import { MessageMessageLabelEntity } from '../../adapters/out/persistence/typeorm/entities/message-message-label.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationRecipient)
    private readonly recipientRepository: Repository<NotificationRecipient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(NotificationOutbox)
    private readonly outboxRepository: Repository<NotificationOutbox>,
    @InjectRepository(NotificationDeliveryAttempt)
    private readonly deliveryAttemptRepository: Repository<NotificationDeliveryAttempt>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageRecipientEntity)
    private readonly messageRecipientRepository: Repository<MessageRecipientEntity>,
    @InjectRepository(MessageThread)
    private readonly messageThreadRepository: Repository<MessageThread>,
    @InjectRepository(MessageLabelEntity)
    private readonly messageLabelRepository: Repository<MessageLabelEntity>,
    @InjectRepository(MessageMessageLabelEntity)
    private readonly messageMessageLabelRepository: Repository<MessageMessageLabelEntity>,
    private readonly realtimeService: NotificationRealtimeService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly accessControlService: AccessControlService,
  ) {}

  private readonly notificationModulePermissions: Record<string, string[]> = {
    purchases: ['purchases.view'],
    production: ['production.read'],
    warehouse: ['warehouses.read'],
    catalog: ['catalog.read'],
    supplies: ['suppliers.read'],
    security: ['security.read'],
    roles: ['roles.read'],
    providers: ['suppliers.read'],
    corporate: ['page.notifications.view'],
    system: ['page.notifications.view'],
  };

  private normalizeEmails(recipients: string) {
    return Array.from(
      new Set(
        recipients
          .split(',')
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private buildMessageRealtimePayload(
    message: MessageEntity,
    recipient: MessageRecipientEntity,
    senderName: string,
  ) {
    return {
      recipientId: recipient.id,
      messageRecipientId: recipient.id,
      message: {
        id: message.id,
        threadId: message.threadId,
        subject: message.subject,
        preview: message.bodyText.slice(0, 140),
        originModule: message.originModule,
        senderName,
        senderType: message.senderType,
        sentAt: message.sentAt,
      },
    };
  }

  private async emitMessageRealtimeToRecipients(
    senderUserId: string,
    message: MessageEntity,
    recipients: MessageRecipientEntity[],
  ) {
    const sender =
      (await this.userRepository.findOne({
        where: { id: senderUserId },
        select: ['name'],
      })) ?? null;
    const senderName = sender?.name?.trim() || 'Usuario';

    recipients.forEach((recipient) => {
      const payload = this.buildMessageRealtimePayload(message, recipient, senderName);
      this.realtimeService.emitToUser(recipient.recipientUserId, 'message.created', payload);
      // Compatibilidad temporal con clientes que aun escuchan eventos legacy.
      this.realtimeService.emitToUser(recipient.recipientUserId, 'notification.created', payload);
    });
  }

  async getAllowedNotificationModules(userId: string) {
    const entries = await Promise.all(
      Object.entries(this.notificationModulePermissions).map(async ([moduleKey, requiredPermissions]) => ({
        key: moduleKey,
        allowed: await this.accessControlService.userHasAllPermissions(userId, requiredPermissions),
      })),
    );

    const labels: Record<string, string> = {
      purchases: 'Compras',
      production: 'Produccion',
      warehouse: 'Almacen',
      catalog: 'Catalogo',
      supplies: 'Suministros',
      security: 'Seguridad',
      roles: 'Roles',
      providers: 'Proveedores',
      corporate: 'Corporativo',
      system: 'Sistema',
    };
    const icons: Record<string, string> = {
      purchases: 'ShoppingCart',
      production: 'Factory',
      warehouse: 'Warehouse',
      catalog: 'PackageSearch',
      supplies: 'Boxes',
      security: 'Shield',
      roles: 'KeyRound',
      providers: 'Truck',
      corporate: 'Mail',
      system: 'Bell',
    };

    return entries
      .filter((entry) => entry.allowed)
      .map((entry) => ({
        key: entry.key,
        label: labels[entry.key] ?? entry.key,
        icon: icons[entry.key] ?? 'Bell',
      }));
  }

  private async ensureCanAccessModule(userId: string, moduleKey: string) {
    const requiredPermissions = this.notificationModulePermissions[moduleKey];
    if (!requiredPermissions) {
      throw new BadRequestException('ORIGIN_MODULE_REQUIRED');
    }
    const allowed = await this.accessControlService.userHasAllPermissions(userId, requiredPermissions);
    if (!allowed) {
      throw new ForbiddenException('ORIGIN_MODULE_ACCESS_DENIED');
    }
  }

  private async resolveRecipientsOrFail(recipientsRaw: string) {
    const recipientEmails = this.normalizeEmails(recipientsRaw);
    if (!recipientEmails.length) {
      throw new BadRequestException('RECIPIENT_EMAIL_NOT_FOUND');
    }
    const invalidFormat = recipientEmails.filter((email) => !this.isValidEmail(email));
    if (invalidFormat.length) {
      throw new BadRequestException({
        message: 'Uno o mas destinatarios no existen',
        identifier: 'RECIPIENT_EMAIL_NOT_FOUND',
        invalidRecipients: invalidFormat,
      });
    }
    const users = await this.userRepository.find({
      where: recipientEmails.map((email) => ({ email })),
      select: ['id', 'email', 'name'],
    });
    const foundByEmail = new Set(users.map((user) => user.email.toLowerCase()));
    const invalidRecipients = recipientEmails.filter((email) => !foundByEmail.has(email));
    if (invalidRecipients.length) {
      throw new BadRequestException({
        message: 'Uno o mas destinatarios no existen',
        identifier: 'RECIPIENT_EMAIL_NOT_FOUND',
        invalidRecipients,
      });
    }
    return users;
  }

  async sendMessage(input: {
    senderUserId: string;
    recipients: string;
    subject: string;
    bodyHtml: string;
    originModule?: string;
    labelIds?: string[];
  }) {
    const users = await this.resolveRecipientsOrFail(input.recipients);

    const originModule = (input.originModule ?? 'corporate').toLowerCase();
    await this.ensureCanAccessModule(input.senderUserId, originModule);

    const thread = await this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        subject: input.subject,
        createdByUserId: input.senderUserId,
        lastMessageAt: new Date(),
      }),
    );

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        parentMessageId: null,
        kind: 'USER_MESSAGE',
        originModule,
        senderType: 'USER',
        senderUserId: input.senderUserId,
        createdByUserId: input.senderUserId,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        bodyJson: null,
        status: 'SENT',
        isDraft: false,
        draftExpiresAt: null,
        sentAt: new Date(),
        sourceEntityType: null,
        sourceEntityId: null,
      }),
    );

    const recipients = users.map((user) =>
      this.messageRecipientRepository.create({
        messageId: message.id,
        recipientUserId: user.id,
        recipientEmail: user.email,
        recipientType: 'TO',
        deliveredAt: new Date(),
      }),
    );
    await this.messageRecipientRepository.save(recipients);
    await this.attachLabelsToMessage(message.id, input.senderUserId, input.labelIds ?? []);

    await this.emitMessageRealtimeToRecipients(input.senderUserId, message, recipients);

    return { id: message.id, threadId: thread.id, recipients: recipients.length };
  }

  async replyMessage(input: {
    senderUserId: string;
    parentMessageId: string;
    bodyHtml: string;
    recipients?: string;
  }) {
    const parent = await this.messageRepository.findOne({ where: { id: input.parentMessageId } });
    if (!parent) throw new NotFoundException('MESSAGE_NOT_FOUND');
    await this.ensureCanAccessModule(input.senderUserId, parent.originModule);

    let users = [] as Array<{ id: string; email: string; name: string }>;
    if (input.recipients?.trim()) {
      users = await this.resolveRecipientsOrFail(input.recipients);
    } else if (parent.senderUserId && parent.senderUserId !== input.senderUserId) {
      const fallback = await this.userRepository.findOne({
        where: { id: parent.senderUserId },
        select: ['id', 'email', 'name'],
      });
      users = fallback ? [fallback] : [];
    }
    if (!users.length) {
      throw new BadRequestException('RECIPIENT_EMAIL_NOT_FOUND');
    }

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        threadId: parent.threadId,
        parentMessageId: parent.id,
        kind: 'USER_MESSAGE',
        originModule: parent.originModule,
        sourceEntityType: parent.sourceEntityType,
        sourceEntityId: parent.sourceEntityId,
        senderType: 'USER',
        senderUserId: input.senderUserId,
        createdByUserId: input.senderUserId,
        subject: parent.subject.startsWith('Re:') ? parent.subject : `Re: ${parent.subject}`,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        bodyJson: null,
        status: 'SENT',
        isDraft: false,
        draftExpiresAt: null,
        sentAt: new Date(),
      }),
    );

    if (parent.threadId) {
      await this.messageThreadRepository.update(
        { id: parent.threadId },
        { lastMessageAt: new Date(), updatedAt: new Date() },
      );
    }

    const recipients = users.map((user) =>
      this.messageRecipientRepository.create({
        messageId: message.id,
        recipientUserId: user.id,
        recipientEmail: user.email,
        recipientType: 'TO',
        deliveredAt: new Date(),
      }),
    );
    await this.messageRecipientRepository.save(recipients);
    await this.emitMessageRealtimeToRecipients(input.senderUserId, message, recipients);

    return { id: message.id, threadId: message.threadId, recipients: recipients.length };
  }

  async listMyLabels(userId: string) {
    return this.messageLabelRepository.find({
      where: [{ ownerUserId: null, isVisible: true }, { ownerUserId: userId, isVisible: true }],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async createCustomLabel(userId: string, name: string, color: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new BadRequestException({ message: 'Nombre de etiqueta obligatorio.', identifier: 'LABEL_NAME_REQUIRED' });
    }
    const key = normalizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    if (!key) {
      throw new BadRequestException({ message: 'Nombre de etiqueta invalido.', identifier: 'LABEL_NAME_INVALID' });
    }

    const exists = await this.messageLabelRepository.findOne({
      where: { ownerUserId: userId, key },
    });
    if (exists?.isVisible) {
      throw new BadRequestException({ message: 'Etiqueta ya existente.', identifier: 'LABEL_ALREADY_EXISTS' });
    }

    if (exists && !exists.isVisible) {
      exists.isVisible = true;
      exists.color = color.trim();
      exists.name = normalizedName;
      exists.updatedAt = new Date();
      try {
        return await this.messageLabelRepository.save(exists);
      } catch {
        throw new InternalServerErrorException({ message: 'No se pudo reactivar la etiqueta.', identifier: 'LABEL_REACTIVATE_FAILED' });
      }
    }

    const entity = this.messageLabelRepository.create({
      ownerUserId: userId,
      key,
      name: normalizedName,
      type: 'CUSTOM',
      color: color.trim(),
      icon: 'Tag',
      isVisible: true,
      sortOrder: 1000,
    });
    try {
      return await this.messageLabelRepository.save(entity);
    } catch {
      throw new InternalServerErrorException({ message: 'No se pudo crear la etiqueta.', identifier: 'LABEL_CREATE_FAILED' });
    }
  }

  async deactivateCustomLabel(userId: string, labelId: string) {
    const label = await this.messageLabelRepository.findOne({
      where: { id: labelId, ownerUserId: userId, type: 'CUSTOM' },
    });
    if (!label) {
      throw new NotFoundException({ message: 'Etiqueta no encontrada.', identifier: 'LABEL_NOT_FOUND' });
    }

    label.isVisible = false;
    label.updatedAt = new Date();
    try {
      await this.messageLabelRepository.save(label);
      return { id: label.id, isVisible: label.isVisible };
    } catch {
      throw new InternalServerErrorException({ message: 'No se pudo eliminar la etiqueta.', identifier: 'LABEL_DELETE_FAILED' });
    }
  }

  private async attachLabelsToMessage(messageId: string, userId: string, labelIds: string[]) {
    const ids = Array.from(new Set((labelIds ?? []).filter(Boolean)));
    if (!ids.length) return;

    const labels = await this.messageLabelRepository.find({
      where: ids.map((id) => ({ id })),
      select: ['id', 'ownerUserId'],
    });
    const allowed = labels.filter((label) => !label.ownerUserId || label.ownerUserId === userId);
    if (!allowed.length) return;

    const records = allowed.map((label) =>
      this.messageMessageLabelRepository.create({
        messageId,
        labelId: label.id,
        createdByUserId: userId,
      }),
    );
    await this.messageMessageLabelRepository.save(records);
  }

  async forwardMessage(input: {
    senderUserId: string;
    parentMessageId: string;
    recipients: string;
    bodyHtml: string;
  }) {
    const parent = await this.messageRepository.findOne({ where: { id: input.parentMessageId } });
    if (!parent) throw new NotFoundException('MESSAGE_NOT_FOUND');
    const users = await this.resolveRecipientsOrFail(input.recipients);
    await this.ensureCanAccessModule(input.senderUserId, parent.originModule);

    const thread = await this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        subject: parent.subject.startsWith('Fwd:') ? parent.subject : `Fwd: ${parent.subject}`,
        createdByUserId: input.senderUserId,
        lastMessageAt: new Date(),
      }),
    );

    const bodyHtml = `${input.bodyHtml}<hr/><p>${parent.bodyHtml}</p>`;
    const message = await this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        parentMessageId: parent.id,
        kind: 'USER_MESSAGE',
        originModule: parent.originModule,
        sourceEntityType: parent.sourceEntityType,
        sourceEntityId: parent.sourceEntityId,
        senderType: 'USER',
        senderUserId: input.senderUserId,
        createdByUserId: input.senderUserId,
        subject: thread.subject,
        bodyHtml,
        bodyText: bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        bodyJson: null,
        status: 'SENT',
        isDraft: false,
        draftExpiresAt: null,
        sentAt: new Date(),
      }),
    );

    const recipients = users.map((user) =>
      this.messageRecipientRepository.create({
        messageId: message.id,
        recipientUserId: user.id,
        recipientEmail: user.email,
        recipientType: 'TO',
        deliveredAt: new Date(),
      }),
    );
    await this.messageRecipientRepository.save(recipients);
    await this.emitMessageRealtimeToRecipients(input.senderUserId, message, recipients);
    return { id: message.id, threadId: thread.id, recipients: recipients.length };
  }

  async listDrafts(userId: string) {
    return this.messageRepository.find({
      where: { createdByUserId: userId, isDraft: true, status: 'DRAFT' },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async createDraft(input: {
    userId: string;
    recipients?: string;
    subject?: string;
    bodyHtml?: string;
    originModule?: string;
  }) {
    const originModule = (input.originModule ?? 'corporate').toLowerCase();
    await this.ensureCanAccessModule(input.userId, originModule);
    const now = new Date();
    const draftExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const thread = await this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        subject: input.subject?.trim() || '(Sin asunto)',
        createdByUserId: input.userId,
        lastMessageAt: now,
      }),
    );
    return this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        parentMessageId: null,
        kind: 'USER_MESSAGE',
        originModule,
        sourceEntityType: null,
        sourceEntityId: null,
        senderType: 'USER',
        senderUserId: input.userId,
        createdByUserId: input.userId,
        subject: input.subject?.trim() || '(Sin asunto)',
        bodyHtml: input.bodyHtml ?? '',
        bodyText: (input.bodyHtml ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        bodyJson: { draftRecipients: input.recipients ?? '' },
        status: 'DRAFT',
        isDraft: true,
        draftExpiresAt,
        sentAt: null,
      }),
    );
  }

  async updateDraft(input: {
    userId: string;
    draftId: string;
    recipients?: string;
    subject?: string;
    bodyHtml?: string;
  }) {
    const draft = await this.messageRepository.findOne({
      where: { id: input.draftId, createdByUserId: input.userId, isDraft: true, status: 'DRAFT' },
    });
    if (!draft) throw new NotFoundException('DRAFT_NOT_FOUND');
    if (draft.draftExpiresAt && draft.draftExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('DRAFT_EXPIRED');
    }
    if (typeof input.subject === 'string') draft.subject = input.subject.trim() || '(Sin asunto)';
    if (typeof input.bodyHtml === 'string') {
      draft.bodyHtml = input.bodyHtml;
      draft.bodyText = input.bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (typeof input.recipients === 'string') {
      draft.bodyJson = {
        ...(draft.bodyJson ?? {}),
        draftRecipients: input.recipients,
      };
    }
    const now = new Date();
    draft.updatedAt = now;
    draft.draftExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const saved = await this.messageRepository.save(draft);
    return { draft: saved, recipients: input.recipients ?? null };
  }

  async deleteDraft(userId: string, draftId: string) {
    const draft = await this.messageRepository.findOne({
      where: { id: draftId, createdByUserId: userId, isDraft: true, status: 'DRAFT' },
    });
    if (!draft) throw new NotFoundException('DRAFT_NOT_FOUND');
    draft.status = 'ARCHIVED';
    return this.messageRepository.save(draft);
  }

  async sendDraft(userId: string, draftId: string, recipientsRaw?: string) {
    const draft = await this.messageRepository.findOne({
      where: { id: draftId, createdByUserId: userId, isDraft: true, status: 'DRAFT' },
    });
    if (!draft) throw new NotFoundException('DRAFT_NOT_FOUND');
    if (draft.draftExpiresAt && draft.draftExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('DRAFT_EXPIRED');
    }
    const draftRecipients = String((draft.bodyJson as Record<string, unknown> | null)?.draftRecipients ?? '').trim();
    const users = await this.resolveRecipientsOrFail((recipientsRaw ?? '').trim() || draftRecipients);
    draft.isDraft = false;
    draft.status = 'SENT';
    draft.sentAt = new Date();
    draft.draftExpiresAt = null;
    const sent = await this.messageRepository.save(draft);

    const recipients = users.map((user) =>
      this.messageRecipientRepository.create({
        messageId: sent.id,
        recipientUserId: user.id,
        recipientEmail: user.email,
        recipientType: 'TO',
        deliveredAt: new Date(),
      }),
    );
    await this.messageRecipientRepository.save(recipients);
    await this.emitMessageRealtimeToRecipients(userId, sent, recipients);
    return { id: sent.id, recipients: recipients.length };
  }

  async listMessages(
    userId: string,
    query: { folder?: 'inbox' | 'sent' | 'trash' | 'starred'; originModule?: string; q?: string; page?: number; limit?: number },
  ) {
    const folder = query.folder ?? 'inbox';
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);

    if (query.originModule) {
      await this.ensureCanAccessModule(userId, query.originModule);
    }

    if (folder === 'sent') {
      const where: any = { senderUserId: userId, isDraft: false };
      if (query.originModule) where.originModule = query.originModule;
      if (query.q) where.subject = ILike(`%${query.q}%`);
      const [items, total] = await this.messageRepository.findAndCount({
        where,
        order: { sentAt: 'DESC', createdAt: 'DESC' },
        take: limit,
        skip: (page - 1) * limit,
      });
      return { page, limit, total, items };
    }

    const qb = this.messageRecipientRepository
      .createQueryBuilder('mr')
      .innerJoin(MessageEntity, 'm', 'm.id = mr.message_id')
      .where('mr.recipient_user_id = :userId', { userId });

    if (folder === 'trash') qb.andWhere('mr.deleted_at IS NOT NULL');
    else qb.andWhere('mr.deleted_at IS NULL');
    if (folder === 'starred') qb.andWhere('mr.starred_at IS NOT NULL');

    if (query.originModule) qb.andWhere('m.origin_module = :originModule', { originModule: query.originModule });
    if (query.q) qb.andWhere('(m.subject ILIKE :q OR m.body_text ILIKE :q)', { q: `%${query.q}%` });

    qb.orderBy('m.sent_at', 'DESC').addOrderBy('m.created_at', 'DESC');

    const total = await qb.clone().getCount();

    const rows = await qb
      .clone()
      .select(['mr.id AS recipient_id', 'mr.message_id AS message_id'])
      .take(limit)
      .skip((page - 1) * limit)
      .getRawMany<{ recipient_id: string; message_id: string }>();

    const recipientIds = rows.map((row) => row.recipient_id);
    const messageIds = rows.map((row) => row.message_id);

    const recipients = recipientIds.length
      ? await this.messageRecipientRepository.find({
          where: recipientIds.map((id) => ({ id })),
        })
      : [];
    const messages = messageIds.length
      ? await this.messageRepository.find({
          where: messageIds.map((id) => ({ id })),
        })
      : [];

    const recipientMap = new Map(recipients.map((recipient) => [recipient.id, recipient]));
    const messageMap = new Map(messages.map((message) => [message.id, message]));

    return {
      page,
      limit,
      total,
      items: rows
        .map((row) => ({
          recipient: recipientMap.get(row.recipient_id) ?? null,
          message: messageMap.get(row.message_id) ?? null,
        }))
        .filter((item): item is { recipient: MessageRecipientEntity; message: MessageEntity | null } => item.recipient !== null),
    };
  }

  async getMessageDetail(userId: string, id: string) {
    const ownMessage = await this.messageRepository.findOne({ where: { id, senderUserId: userId } });
    if (ownMessage) {
      const thread = ownMessage.threadId
        ? await this.messageRepository.find({
            where: { threadId: ownMessage.threadId },
            order: { createdAt: 'ASC' },
          })
        : [ownMessage];
      return { message: ownMessage, thread };
    }

    const recipient = await this.messageRecipientRepository.findOne({ where: { id } });
    if (!recipient || recipient.recipientUserId !== userId) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }

    const message = await this.messageRepository.findOne({ where: { id: recipient.messageId } });
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');
    await this.ensureCanAccessModule(userId, message.originModule);

    if (!recipient.readAt) {
      recipient.readAt = new Date();
      await this.messageRecipientRepository.save(recipient);
    }

    const thread = message.threadId
      ? await this.messageRepository.find({
          where: { threadId: message.threadId },
          order: { createdAt: 'ASC' },
        })
      : [message];

    return { recipient, message, thread };
  }

  async markMessageAsRead(userId: string, recipientId: string) {
    const recipient = await this.messageRecipientRepository.findOne({ where: { id: recipientId } });
    if (!recipient || recipient.recipientUserId !== userId) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }
    if (!recipient.readAt) {
      recipient.readAt = new Date();
      await this.messageRecipientRepository.save(recipient);
    }
    return recipient;
  }

  async toggleStarMessage(userId: string, recipientId: string, value: boolean) {
    const recipient = await this.messageRecipientRepository.findOne({ where: { id: recipientId } });
    if (!recipient || recipient.recipientUserId !== userId) throw new NotFoundException('MESSAGE_NOT_FOUND');
    recipient.starredAt = value ? new Date() : null;
    return this.messageRecipientRepository.save(recipient);
  }

  async deleteMessage(userId: string, recipientId: string) {
    const recipient = await this.messageRecipientRepository.findOne({ where: { id: recipientId } });
    if (!recipient || recipient.recipientUserId !== userId) throw new NotFoundException('MESSAGE_NOT_FOUND');
    const now = new Date();
    recipient.deletedAt = now;
    (recipient as any).trashExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.messageRecipientRepository.save(recipient);
  }

  async restoreMessage(userId: string, recipientId: string) {
    const recipient = await this.messageRecipientRepository.findOne({ where: { id: recipientId } });
    if (!recipient || recipient.recipientUserId !== userId) throw new NotFoundException('MESSAGE_NOT_FOUND');
    recipient.deletedAt = null;
    return this.messageRecipientRepository.save(recipient);
  }

  async bulkUpdateMessages(
    userId: string,
    input: {
      messageRecipientIds: string[];
      action: 'MARK_AS_READ' | 'MARK_AS_UNREAD' | 'DELETE' | 'STAR' | 'UNSTAR' | 'RESTORE';
    },
  ) {
    const ids = Array.from(new Set(input.messageRecipientIds.filter(Boolean)));
    if (!ids.length) return { updated: 0 };
    const recipients = await this.messageRecipientRepository.find({ where: ids.map((id) => ({ id })) });
    const own = recipients.filter((recipient) => recipient.recipientUserId === userId);
    const now = new Date();
    own.forEach((recipient) => {
      if (input.action === 'MARK_AS_READ') recipient.readAt = recipient.readAt ?? now;
      if (input.action === 'MARK_AS_UNREAD') recipient.readAt = null;
      if (input.action === 'DELETE') recipient.deletedAt = now;
      if (input.action === 'RESTORE') recipient.deletedAt = null;
      if (input.action === 'STAR') recipient.starredAt = now;
      if (input.action === 'UNSTAR') recipient.starredAt = null;
    });
    await this.messageRecipientRepository.save(own);
    return { updated: own.length };
  }

  async listMyNotifications(userId: string, limit = 20, cursor?: string) {
    const qb = this.recipientRepository
      .createQueryBuilder('recipient')
      .innerJoinAndSelect('recipient.notification', 'notification')
      .innerJoin('recipient.recipientUser', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('recipient.createdAt', 'DESC')
      .take(Math.min(Math.max(limit, 1), 100));

    if (cursor) {
      qb.andWhere('recipient.createdAt < :cursor', { cursor: new Date(cursor) });
    }

    const rows = await qb.getMany();
    return rows.map((row) => this.toResponse(row));
  }

  async getUnreadCount(userId: string) {
    const unread = await this.recipientRepository
      .createQueryBuilder('recipient')
      .innerJoin('recipient.recipientUser', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('recipient.readAt IS NULL')
      .andWhere("recipient.status NOT IN ('ARCHIVED', 'DELETED')")
      .getCount();

    const unseen = await this.recipientRepository
      .createQueryBuilder('recipient')
      .innerJoin('recipient.recipientUser', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('recipient.seenAt IS NULL')
      .andWhere("recipient.status NOT IN ('ARCHIVED', 'DELETED')")
      .getCount();

    return { unread, unseen };
  }

  async getMyNotificationDetail(userId: string, recipientId: string) {
    const row = await this.findRecipientOrThrow(userId, recipientId);
    return this.toResponse(row);
  }

  async markAsSeen(userId: string, recipientId: string) {
    const row = await this.findRecipientOrThrow(userId, recipientId);
    if (!row.seenAt) {
      row.seenAt = new Date();
      if (row.status === 'UNREAD') {
        row.status = 'SEEN';
      }
      await this.recipientRepository.save(row);
      this.realtimeService.emitToUser(userId, 'notification.seen', this.toResponse(row));
      await this.emitUnreadCountUpdated(userId);
    }

    return this.toResponse(row);
  }

  async markAsRead(userId: string, recipientId: string) {
    const row = await this.findRecipientOrThrow(userId, recipientId);
    const now = new Date();
    if (!row.seenAt) row.seenAt = now;
    if (!row.readAt) row.readAt = now;
    row.status = 'READ';
    await this.recipientRepository.save(row);
    this.realtimeService.emitToUser(userId, 'notification.read', this.toResponse(row));
    await this.emitUnreadCountUpdated(userId);
    return this.toResponse(row);
  }

  async markAllAsRead(userId: string) {
    const rows = await this.recipientRepository
      .createQueryBuilder('recipient')
      .innerJoinAndSelect('recipient.recipientUser', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('recipient.readAt IS NULL')
      .getMany();

    if (!rows.length) return { updated: 0 };

    const now = new Date();
    rows.forEach((row) => {
      row.seenAt = row.seenAt ?? now;
      row.readAt = now;
      row.status = 'READ';
    });
    await this.recipientRepository.save(rows);
    this.realtimeService.emitToUser(userId, 'notification.updated', { type: 'READ_ALL' });
    await this.emitUnreadCountUpdated(userId);
    return { updated: rows.length };
  }

  async archive(userId: string, recipientId: string) {
    const row = await this.findRecipientOrThrow(userId, recipientId);
    row.archivedAt = new Date();
    row.status = 'ARCHIVED';
    await this.recipientRepository.save(row);
    this.realtimeService.emitToUser(userId, 'notification.archived', this.toResponse(row));
    await this.emitUnreadCountUpdated(userId);
    return this.toResponse(row);
  }

  async createDevNotificationForUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [created] = await this.createNotificationForUsers({
      recipientUserIds: [userId],
      type: 'SYSTEM_MESSAGE',
      category: 'SYSTEM',
      title: 'Notificacion de prueba',
      message: `Mensaje realtime para ${user.email}`,
      priority: 'HIGH',
      actionUrl: '/notifications',
      actionLabel: 'Ver bandeja',
      metadata: { source: 'dev-endpoint' },
      isSystem: true,
      sourceModule: 'notifications',
      sourceEntityType: 'notification',
      sourceEntityId: null,
    });

    return this.getMyNotificationDetail(userId, created.recipientId);
  }

  async createNotificationForUsers(input: {
    recipientUserIds: string[];
    type: string;
    category: string;
    title: string;
    message: string;
    priority?: NotificationPriority;
    actionUrl?: string | null;
    actionLabel?: string | null;
    metadata?: Record<string, unknown> | null;
    isSystem?: boolean;
    showAsToast?: boolean;
    sourceModule?: string | null;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
  }) {
    const recipientUserIds = Array.from(new Set(input.recipientUserIds.filter(Boolean)));
    if (!recipientUserIds.length) return [];

    const users = await this.userRepository.findBy({ id: In(recipientUserIds) });
    if (!users.length) return [];

    const notification = this.notificationRepository.create({
      type: input.type,
      category: input.category,
      title: input.title,
      message: input.message,
      priority: input.priority ?? 'NORMAL',
      actionUrl: input.actionUrl ?? null,
      actionLabel: input.actionLabel ?? null,
      metadata: input.metadata ?? {},
      isSystem: input.isSystem ?? false,
      showAsToast: input.showAsToast ?? true,
      sourceModule: input.sourceModule ?? null,
      sourceEntityType: input.sourceEntityType ?? null,
      sourceEntityId: input.sourceEntityId ?? null,
    });
    const savedNotification = await this.notificationRepository.save(notification);

    const createdRecipients: Array<{ userId: string; recipientId: string }> = [];
    for (const user of users) {
      const recipient = this.recipientRepository.create({
        notification: savedNotification,
        recipientUser: user,
        status: 'UNREAD',
      });
      const savedRecipient = await this.recipientRepository.save(recipient);
      const outbox = this.outboxRepository.create({
        notificationRecipient: savedRecipient,
        eventType: 'NOTIFICATION_CREATED',
        payload: {
          recipientId: savedRecipient.id,
          userId: user.id,
          notificationId: savedNotification.id,
        },
        status: 'PENDING',
        attempts: 0,
      });
      const savedOutbox = await this.outboxRepository.save(outbox);
      await this.notificationQueueService.enqueueOutboxDelivery(savedOutbox.id);
      createdRecipients.push({ userId: user.id, recipientId: savedRecipient.id });
    }

    return createdRecipients;
  }

  private async emitUnreadCountUpdated(userId: string) {
    const count = await this.getUnreadCount(userId);
    this.realtimeService.emitToUser(userId, 'notification.unread_count_updated', count);
  }

  async processOutboxDeliveryJob(outboxId: string) {
    const outbox = await this.outboxRepository.findOne({
      where: { id: outboxId },
      relations: ['notificationRecipient', 'notificationRecipient.notification', 'notificationRecipient.recipientUser'],
    });

    if (!outbox) {
      return;
    }

    if (outbox.status === 'PROCESSED') {
      return;
    }

    const attemptNumber = outbox.attempts + 1;
    const recipient = outbox.notificationRecipient;
    const userId = recipient.recipientUser.id;

    outbox.status = 'PROCESSING';
    await this.outboxRepository.save(outbox);

    try {
      const payload = await this.getMyNotificationDetail(userId, recipient.id);
      this.realtimeService.emitToUser(userId, 'notification.created', payload);

      if (!recipient.deliveredAt) {
        recipient.deliveredAt = new Date();
        await this.recipientRepository.save(recipient);
      }

      const successAttempt = this.deliveryAttemptRepository.create({
        notificationRecipient: recipient,
        channel: 'WEBSOCKET',
        status: 'SUCCESS',
        attemptNumber,
        errorMessage: null,
        providerResponse: { event: 'notification.created' },
      });
      await this.deliveryAttemptRepository.save(successAttempt);

      outbox.status = 'PROCESSED';
      outbox.processedAt = new Date();
      outbox.nextRetryAt = null;
      outbox.attempts = attemptNumber;
      await this.outboxRepository.save(outbox);

      await this.emitUnreadCountUpdated(userId);
    } catch (error) {
      const failAttempt = this.deliveryAttemptRepository.create({
        notificationRecipient: recipient,
        channel: 'WEBSOCKET',
        status: 'FAILED',
        attemptNumber,
        errorMessage: error instanceof Error ? error.message : 'Unknown delivery error',
        providerResponse: {},
      });
      await this.deliveryAttemptRepository.save(failAttempt);

      outbox.status = 'FAILED';
      outbox.attempts = attemptNumber;
      outbox.nextRetryAt = new Date(Date.now() + 30_000);
      await this.outboxRepository.save(outbox);

      throw error;
    }
  }

  private async findRecipientOrThrow(userId: string, recipientId: string) {
    const row = await this.recipientRepository
      .createQueryBuilder('recipient')
      .innerJoinAndSelect('recipient.notification', 'notification')
      .innerJoinAndSelect('recipient.recipientUser', 'user')
      .where('recipient.id = :recipientId', { recipientId })
      .andWhere('user.id = :userId', { userId })
      .getOne();

    if (!row) {
      throw new NotFoundException('Notification not found');
    }

    return row;
  }

  private toResponse(row: NotificationRecipient) {
    return {
      recipientId: row.id,
      status: row.status,
      seenAt: row.seenAt,
      readAt: row.readAt,
      deliveredAt: row.deliveredAt,
      archivedAt: row.archivedAt,
      dismissedAt: row.dismissedAt,
      createdAt: row.createdAt,
      notification: {
        id: row.notification.id,
        type: row.notification.type,
        category: row.notification.category,
        title: row.notification.title,
        message: row.notification.message,
        priority: row.notification.priority,
        sourceModule: row.notification.sourceModule,
        sourceEntityType: row.notification.sourceEntityType,
        sourceEntityId: row.notification.sourceEntityId,
        actionUrl: row.notification.actionUrl,
        actionLabel: row.notification.actionLabel,
        metadata: row.notification.metadata,
        isSystem: row.notification.isSystem,
        showAsToast: row.notification.showAsToast,
        createdAt: row.notification.createdAt,
      },
    };
  }
}
