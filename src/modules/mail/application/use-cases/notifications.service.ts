import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { NotificationRealtimeService } from '../../infrastructure/realtime/notification-realtime.service';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { MessageEntity } from '../../adapters/out/persistence/typeorm/entities/message.entity';
import { MessageRecipientEntity } from '../../adapters/out/persistence/typeorm/entities/message-recipient.entity';
import { MessageThread } from '../../adapters/out/persistence/typeorm/entities/message-thread.entity';
import { MessageLabelEntity } from '../../adapters/out/persistence/typeorm/entities/message-label.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { MessageAttachmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-attachment.entity';
import { MessageLabelAssignmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-label-assignment.entity';
import { MessageSearchHistoryEntity } from '../../adapters/out/persistence/typeorm/entities/message-search-history.entity';
import { MessageAuditLogEntity } from '../../adapters/out/persistence/typeorm/entities/message-audit-log.entity';
import { ACCESS_CONTROL_PORT, AccessControlPort } from '../ports/access-control.port';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageRecipientEntity)
    private readonly messageRecipientRepository: Repository<MessageRecipientEntity>,
    @InjectRepository(MessageThread)
    private readonly messageThreadRepository: Repository<MessageThread>,
    @InjectRepository(MessageLabelEntity)
    private readonly messageLabelRepository: Repository<MessageLabelEntity>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(MessageAttachmentEntity)
    private readonly messageAttachmentRepository: Repository<MessageAttachmentEntity>,
    @InjectRepository(MessageLabelAssignmentEntity)
    private readonly messageLabelAssignmentRepository: Repository<MessageLabelAssignmentEntity>,
    @InjectRepository(MessageSearchHistoryEntity)
    private readonly messageSearchHistoryRepository: Repository<MessageSearchHistoryEntity>,
    @InjectRepository(MessageAuditLogEntity)
    private readonly messageAuditLogRepository: Repository<MessageAuditLogEntity>,
    private readonly realtimeService: NotificationRealtimeService,
    private readonly dataSource: DataSource,
    @Inject(ACCESS_CONTROL_PORT)
    private readonly accessControlPort: AccessControlPort,
  ) {}

  private readonly attachmentStorageDir = path.resolve(process.cwd(), 'storage', 'mail-attachments');
  private readonly allowedAttachmentMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ]);
  private readonly allowedAttachmentExtensions = new Set([
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.txt',
  ]);
  private readonly maxAttachmentSizeBytes = 20 * 1024 * 1024;

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

  private normalizeEmails(recipients: string[] | string | undefined | null) {
    if (!recipients) return [];
    const values = Array.isArray(recipients) ? recipients : recipients.split(',');
    return Array.from(new Set(values.map((email) => email.trim().toLowerCase()).filter(Boolean)));
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private toUuidOrNull(value?: string | null) {
    if (!value) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      ? value
      : null;
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
        allowed: await this.accessControlPort.canViewModuleMessages(userId, requiredPermissions),
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

  async canOpenMessage(userId: string, messageId: string) {
    const ownMessage = await this.messageRepository.findOne({ where: { id: messageId, senderUserId: userId } });
    if (ownMessage) {
      const allowed = await this.accessControlPort.canOpenMessage(
        userId,
        this.notificationModulePermissions[ownMessage.originModule] ?? ['page.notifications.view'],
      );
      return allowed;
    }
    const state = await this.messageUserStateRepository.findOne({ where: { messageId, userId } });
    if (!state) return false;
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) return false;
    return this.accessControlPort.canOpenMessage(
      userId,
      this.notificationModulePermissions[message.originModule] ?? ['page.notifications.view'],
    );
  }

  private async ensureCanAccessModule(userId: string, moduleKey: string) {
    const requiredPermissions = this.notificationModulePermissions[moduleKey];
    if (!requiredPermissions) {
      throw new BadRequestException('ORIGIN_MODULE_REQUIRED');
    }
    const allowed = await this.accessControlPort.canViewModuleMessages(userId, requiredPermissions);
    if (!allowed) {
      throw new ForbiddenException('ORIGIN_MODULE_ACCESS_DENIED');
    }
  }

  private async resolveRecipientsByBucketsOrFail(input: {
    to?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients?: string;
  }) {
    const ordered: Array<{ type: 'TO' | 'CC' | 'BCC'; emails: string[] }> = [
      { type: 'TO', emails: this.normalizeEmails(input.to) },
      { type: 'CC', emails: this.normalizeEmails(input.cc) },
      { type: 'BCC', emails: this.normalizeEmails(input.bcc) },
    ];

    if (!ordered.some((entry) => entry.emails.length) && input.recipients) {
      ordered[0].emails = this.normalizeEmails(input.recipients);
    }

    const dedupedByPriority = new Set<string>();
    const byType = new Map<'TO' | 'CC' | 'BCC', string[]>();
    ordered.forEach((entry) => {
      const list: string[] = [];
      entry.emails.forEach((email) => {
        if (dedupedByPriority.has(email)) return;
        dedupedByPriority.add(email);
        list.push(email);
      });
      byType.set(entry.type, list);
    });

    const recipientEmails = Array.from(dedupedByPriority);
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
    const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
    const recipients = Array.from(byType.entries()).flatMap(([relationType, emails]) =>
      emails
        .map((email) => {
          const user = usersByEmail.get(email);
          if (!user) return null;
          return { id: user.id, email: user.email, name: user.name, relationType };
        })
        .filter((item): item is { id: string; email: string; name: string; relationType: 'TO' | 'CC' | 'BCC' } => Boolean(item)),
    );

    return { recipients, byType };
  }

  private sanitizeHtmlBody(bodyHtml: string) {
    let sanitized = String(bodyHtml ?? '');
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
    sanitized = sanitized.replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    sanitized = sanitized.replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[^>]*\/?\s*>/gi, '');
    sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '');
    sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '');
    sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '');
    sanitized = sanitized.replace(/\s(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, ' $1="#"');
    sanitized = sanitized.replace(/\s(href|src)\s*=\s*'\s*javascript:[^']*'/gi, " $1='#'");
    sanitized = sanitized.replace(/\s(href|src)\s*=\s*(javascript:[^\s>]+)/gi, ' $1="#"');
    sanitized = sanitized.replace(/\sstyle\s*=\s*"[^"]*(expression|javascript:|url\s*\(\s*javascript:)[^"]*"/gi, '');
    sanitized = sanitized.replace(/\sstyle\s*=\s*'[^']*(expression|javascript:|url\s*\(\s*javascript:)[^']*'/gi, '');
    sanitized = sanitized.replace(/<a\b([^>]*)>/gi, (_m, attrs: string) => {
      const hasTargetBlank = /\btarget\s*=\s*(['"])_blank\1/i.test(attrs);
      if (!hasTargetBlank) return `<a${attrs}>`;
      if (/\brel\s*=/i.test(attrs)) return `<a${attrs}>`;
      return `<a${attrs} rel="noopener noreferrer">`;
    });
    return sanitized.trim();
  }

  private normalizeHtmlBody(bodyHtml: string) {
    return this.sanitizeHtmlBody(bodyHtml);
  }

  private toBodyText(bodyHtml: string) {
    return this.normalizeHtmlBody(bodyHtml).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private async createAuditLog(input: {
    action: string;
    actorUserId?: string | null;
    messageId?: string | null;
    threadId?: string | null;
    metadata?: Record<string, unknown>;
  }, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(MessageAuditLogEntity) : this.messageAuditLogRepository;
    await repo.save(
      repo.create({
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        messageId: input.messageId ?? null,
        threadId: input.threadId ?? null,
        metadata: input.metadata ?? {},
      }),
    );
  }

  private async createMessageUserStates(input: {
    message: MessageEntity;
    senderUserId: string;
    recipients: Array<{ id: string; email: string; relationType: 'TO' | 'CC' | 'BCC' }>;
  }, manager?: EntityManager) {
    const stateRepo = manager ? manager.getRepository(MessageUserStateEntity) : this.messageUserStateRepository;
    const now = new Date();
    const states: MessageUserStateEntity[] = [];

    states.push(
      stateRepo.create({
        messageId: input.message.id,
        threadId: input.message.threadId,
        userId: input.senderUserId,
        relationType: 'SENDER',
        recipientEmail: null,
        isInInbox: false,
        isInSent: true,
        isArchived: false,
        isMuted: false,
        readAt: now,
        starredAt: null,
        snoozedUntil: null,
        snoozedAt: null,
        deletedAt: null,
        trashExpiresAt: null,
        permanentlyHiddenAt: null,
        deliveredAt: now,
        openedAt: now,
      }),
    );

    for (const recipient of input.recipients) {
      states.push(
        stateRepo.create({
          messageId: input.message.id,
          threadId: input.message.threadId,
          userId: recipient.id,
          relationType: recipient.relationType,
          recipientEmail: recipient.email,
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
          deliveredAt: now,
          openedAt: null,
        }),
      );
    }

    return stateRepo.save(states);
  }

  private async findMessageStateOrThrow(userId: string, stateId: string) {
    const state = await this.messageUserStateRepository.findOne({
      where: { id: stateId, userId },
    });
    if (!state) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }
    return state;
  }

  private async ensureMessageParticipant(userId: string, messageId: string) {
    const ownMessage = await this.messageRepository.findOne({ where: { id: messageId, senderUserId: userId } });
    if (ownMessage) return true;
    const state = await this.messageUserStateRepository.findOne({ where: { messageId, userId } });
    return Boolean(state);
  }

  private async upsertSearchHistory(userId: string, queryRaw: string) {
    const query = queryRaw.trim();
    if (!query) return;
    const existing = await this.messageSearchHistoryRepository.findOne({
      where: { userId, query },
    });
    if (existing) {
      existing.usedCount += 1;
      existing.lastUsedAt = new Date();
      await this.messageSearchHistoryRepository.save(existing);
    } else {
      await this.messageSearchHistoryRepository.save(
        this.messageSearchHistoryRepository.create({
          userId,
          query,
          usedCount: 1,
          lastUsedAt: new Date(),
        }),
      );
    }

    const all = await this.messageSearchHistoryRepository.find({
      where: { userId },
      order: { lastUsedAt: 'DESC', createdAt: 'DESC' },
    });
    if (all.length > 10) {
      const overflow = all.slice(10);
      await this.messageSearchHistoryRepository.delete(overflow.map((item) => item.id));
    }
  }

  async sendMessage(input: {
    senderUserId: string;
    to?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients?: string;
    subject: string;
    bodyHtml: string;
    originModule?: string;
    labelIds?: string[];
    attachmentIds?: string[];
  }) {
    const { recipients: resolvedRecipients } = await this.resolveRecipientsByBucketsOrFail({
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      recipients: input.recipients,
    });

    const originModule = (input.originModule ?? 'corporate').toLowerCase();
    await this.ensureCanAccessModule(input.senderUserId, originModule);
    const bodyHtml = this.normalizeHtmlBody(input.bodyHtml);
    const bodyText = this.toBodyText(bodyHtml);
    const txResult = await this.dataSource.transaction(async (manager) => {
      const threadRepo = manager.getRepository(MessageThread);
      const messageRepo = manager.getRepository(MessageEntity);
      const recipientRepo = manager.getRepository(MessageRecipientEntity);
      const thread = await threadRepo.save(
        threadRepo.create({
          subject: input.subject,
          createdByUserId: input.senderUserId,
          originModule,
          lastMessageAt: new Date(),
        }),
      );

      const message = await messageRepo.save(
        messageRepo.create({
          threadId: thread.id,
          parentMessageId: null,
          kind: 'USER_MESSAGE',
          originModule,
          senderType: 'USER',
          senderUserId: input.senderUserId,
          createdByUserId: input.senderUserId,
          subject: input.subject,
          bodyHtml,
          bodyText,
          bodyJson: null,
          status: 'SENT',
          isDraft: false,
          draftExpiresAt: null,
          sentAt: new Date(),
          sourceEntityType: null,
          sourceEntityId: null,
        }),
      );

      const recipients = resolvedRecipients.map((user) =>
        recipientRepo.create({
          messageId: message.id,
          recipientUserId: user.id,
          recipientEmail: user.email,
          recipientType: user.relationType,
          deliveredAt: new Date(),
        }),
      );
      const savedRecipients = await recipientRepo.save(recipients);
      const states = await this.createMessageUserStates(
        {
          message,
          senderUserId: input.senderUserId,
          recipients: resolvedRecipients.map((user) => ({ id: user.id, email: user.email, relationType: user.relationType })),
        },
        manager,
      );
      await this.linkAttachmentsToMessage(input.senderUserId, message.id, input.attachmentIds ?? [], undefined, manager);
      const senderState = states.find((state) => state.userId === input.senderUserId && state.relationType === 'SENDER');
      if (senderState) {
        await this.assignLabelsToState(senderState.id, input.senderUserId, input.labelIds ?? [], manager);
      }

      await this.createAuditLog(
        {
          action: 'MESSAGE_SENT',
          actorUserId: input.senderUserId,
          messageId: message.id,
          threadId: message.threadId,
          metadata: {
            recipients: resolvedRecipients.map((user) => user.email),
            to: resolvedRecipients.filter((item) => item.relationType === 'TO').map((item) => item.email),
            cc: resolvedRecipients.filter((item) => item.relationType === 'CC').map((item) => item.email),
            bcc: resolvedRecipients.filter((item) => item.relationType === 'BCC').map((item) => item.email),
            originModule,
          },
        },
        manager,
      );

      return { message, thread, recipients: savedRecipients };
    });

    await this.emitMessageRealtimeToRecipients(input.senderUserId, txResult.message, txResult.recipients);

    return { id: txResult.message.id, threadId: txResult.thread.id, recipients: txResult.recipients.length };
  }

  async replyMessage(input: {
    senderUserId: string;
    parentMessageId: string;
    bodyHtml: string;
    to?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients?: string;
    attachmentIds?: string[];
  }) {
    const parent = await this.messageRepository.findOne({ where: { id: input.parentMessageId } });
    if (!parent) throw new NotFoundException('MESSAGE_NOT_FOUND');
    await this.ensureCanAccessModule(input.senderUserId, parent.originModule);

    let resolvedRecipients: Array<{ id: string; email: string; name: string; relationType: 'TO' | 'CC' | 'BCC' }> = [];
    const hasTypedRecipients =
      this.normalizeEmails(input.to).length > 0 ||
      this.normalizeEmails(input.cc).length > 0 ||
      this.normalizeEmails(input.bcc).length > 0 ||
      Boolean(input.recipients?.trim());
    if (hasTypedRecipients) {
      const resolved = await this.resolveRecipientsByBucketsOrFail({
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        recipients: input.recipients,
      });
      resolvedRecipients = resolved.recipients;
    } else if (parent.senderUserId && parent.senderUserId !== input.senderUserId) {
      const fallback = await this.userRepository.findOne({
        where: { id: parent.senderUserId },
        select: ['id', 'email', 'name'],
      });
      resolvedRecipients = fallback ? [{ ...fallback, relationType: 'TO' }] : [];
    }
    if (!resolvedRecipients.length) {
      throw new BadRequestException('RECIPIENT_EMAIL_NOT_FOUND');
    }

    const bodyHtml = this.normalizeHtmlBody(input.bodyHtml);
    const bodyText = this.toBodyText(bodyHtml);
    const txResult = await this.dataSource.transaction(async (manager) => {
      const messageRepo = manager.getRepository(MessageEntity);
      const threadRepo = manager.getRepository(MessageThread);
      const recipientRepo = manager.getRepository(MessageRecipientEntity);
      const message = await messageRepo.save(
        messageRepo.create({
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
          bodyHtml,
          bodyText,
          bodyJson: null,
          status: 'SENT',
          isDraft: false,
          draftExpiresAt: null,
          sentAt: new Date(),
        }),
      );

      if (parent.threadId) {
        await threadRepo.update({ id: parent.threadId }, { lastMessageAt: new Date(), updatedAt: new Date() });
      }

      const recipients = resolvedRecipients.map((user) =>
        recipientRepo.create({
          messageId: message.id,
          recipientUserId: user.id,
          recipientEmail: user.email,
          recipientType: user.relationType,
          deliveredAt: new Date(),
        }),
      );
      const savedRecipients = await recipientRepo.save(recipients);
      await this.createMessageUserStates(
        {
          message,
          senderUserId: input.senderUserId,
          recipients: resolvedRecipients.map((user) => ({ id: user.id, email: user.email, relationType: user.relationType })),
        },
        manager,
      );
      await this.linkAttachmentsToMessage(input.senderUserId, message.id, input.attachmentIds ?? [], undefined, manager);
      await this.createAuditLog(
        {
          action: 'MESSAGE_REPLIED',
          actorUserId: input.senderUserId,
          messageId: message.id,
          threadId: message.threadId,
          metadata: {
            parentMessageId: parent.id,
            recipients: resolvedRecipients.map((user) => user.email),
            to: resolvedRecipients.filter((item) => item.relationType === 'TO').map((item) => item.email),
            cc: resolvedRecipients.filter((item) => item.relationType === 'CC').map((item) => item.email),
            bcc: resolvedRecipients.filter((item) => item.relationType === 'BCC').map((item) => item.email),
          },
        },
        manager,
      );
      return { message, recipients: savedRecipients };
    });
    await this.emitMessageRealtimeToRecipients(input.senderUserId, txResult.message, txResult.recipients);

    return { id: txResult.message.id, threadId: txResult.message.threadId, recipients: txResult.recipients.length };
  }

  async listMyLabels(userId: string) {
    const labels = await this.messageLabelRepository.find({
      where: [{ ownerUserId: null, isVisible: true }, { ownerUserId: userId, isVisible: true }],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const allowedModules = await this.getAllowedNotificationModules(userId);
    const allowedKeys = new Set(allowedModules.map((moduleItem) => moduleItem.key));
    return labels.filter((label) => (label.type === 'MODULE' ? allowedKeys.has(label.key) : true));
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

  private async assignLabelsToState(messageUserStateId: string, userId: string, labelIds: string[], manager?: EntityManager) {
    const labelRepo = manager ? manager.getRepository(MessageLabelEntity) : this.messageLabelRepository;
    const assignmentRepo = manager ? manager.getRepository(MessageLabelAssignmentEntity) : this.messageLabelAssignmentRepository;
    const ids = Array.from(new Set((labelIds ?? []).filter(Boolean)));
    if (!ids.length) return;

    const labels = await labelRepo.find({
      where: ids.map((id) => ({ id })),
      select: ['id', 'ownerUserId', 'key', 'type'],
    });
    const allowedModules = await this.getAllowedNotificationModules(userId);
    const allowedModuleKeys = new Set(allowedModules.map((moduleItem) => moduleItem.key));
    const allowed = labels.filter((label) => {
      const ownerAllowed = !label.ownerUserId || label.ownerUserId === userId;
      if (!ownerAllowed) return false;
      if (label.type !== 'MODULE') return true;
      return allowedModuleKeys.has(label.key);
    });
    if (!allowed.length) return;

    const existing = await assignmentRepo.find({
      where: allowed.map((label) => ({
        messageUserStateId,
        userId,
        labelId: label.id,
      })),
      select: ['labelId'],
    });
    const existingIds = new Set(existing.map((item) => item.labelId));
    const toInsert = allowed.filter((label) => !existingIds.has(label.id));
    if (!toInsert.length) return;

    const records = toInsert.map((label) =>
      assignmentRepo.create({
        labelId: label.id,
        messageUserStateId,
        userId,
      }),
    );
    await assignmentRepo.save(records);
  }

  async updateCustomLabel(
    userId: string,
    labelId: string,
    input: { name?: string; color?: string; isVisible?: boolean },
  ) {
    const label = await this.messageLabelRepository.findOne({
      where: { id: labelId, ownerUserId: userId, type: 'CUSTOM' },
    });
    if (!label) {
      throw new NotFoundException({ message: 'Etiqueta no encontrada.', identifier: 'LABEL_NOT_FOUND' });
    }

    if (typeof input.name === 'string') {
      const normalizedName = input.name.trim();
      if (!normalizedName) {
        throw new BadRequestException({ message: 'Nombre de etiqueta obligatorio.', identifier: 'LABEL_NAME_REQUIRED' });
      }
      const key = normalizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
      if (!key) {
        throw new BadRequestException({ message: 'Nombre de etiqueta invalido.', identifier: 'LABEL_NAME_INVALID' });
      }
      const duplicated = await this.messageLabelRepository.findOne({
        where: { ownerUserId: userId, key },
      });
      if (duplicated && duplicated.id !== label.id) {
        throw new BadRequestException({ message: 'Etiqueta ya existente.', identifier: 'LABEL_ALREADY_EXISTS' });
      }
      label.name = normalizedName;
      label.key = key;
    }

    if (typeof input.color === 'string') {
      const color = input.color.trim();
      label.color = color || null;
    }

    if (typeof input.isVisible === 'boolean') {
      label.isVisible = input.isVisible;
    }

    label.updatedAt = new Date();
    try {
      return await this.messageLabelRepository.save(label);
    } catch {
      throw new InternalServerErrorException({ message: 'No se pudo actualizar la etiqueta.', identifier: 'LABEL_UPDATE_FAILED' });
    }
  }

  async forwardMessage(input: {
    senderUserId: string;
    parentMessageId: string;
    to?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients?: string;
    bodyHtml: string;
    attachmentIds?: string[];
  }) {
    const parent = await this.messageRepository.findOne({ where: { id: input.parentMessageId } });
    if (!parent) throw new NotFoundException('MESSAGE_NOT_FOUND');
    const { recipients: resolvedRecipients } = await this.resolveRecipientsByBucketsOrFail({
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      recipients: input.recipients,
    });
    await this.ensureCanAccessModule(input.senderUserId, parent.originModule);

    const bodyHtml = this.normalizeHtmlBody(`${this.normalizeHtmlBody(input.bodyHtml)}<hr/><p>${parent.bodyHtml}</p>`);
    const bodyText = this.toBodyText(bodyHtml);
    const txResult = await this.dataSource.transaction(async (manager) => {
      const threadRepo = manager.getRepository(MessageThread);
      const messageRepo = manager.getRepository(MessageEntity);
      const recipientRepo = manager.getRepository(MessageRecipientEntity);
      const thread = await threadRepo.save(
        threadRepo.create({
          subject: parent.subject.startsWith('Fwd:') ? parent.subject : `Fwd: ${parent.subject}`,
          createdByUserId: input.senderUserId,
          originModule: parent.originModule,
          sourceEntityType: parent.sourceEntityType,
          sourceEntityId: parent.sourceEntityId,
          lastMessageAt: new Date(),
        }),
      );

      const message = await messageRepo.save(
        messageRepo.create({
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
          bodyText,
          bodyJson: null,
          status: 'SENT',
          isDraft: false,
          draftExpiresAt: null,
          sentAt: new Date(),
        }),
      );

      const recipients = resolvedRecipients.map((user) =>
        recipientRepo.create({
          messageId: message.id,
          recipientUserId: user.id,
          recipientEmail: user.email,
          recipientType: user.relationType,
          deliveredAt: new Date(),
        }),
      );
      const savedRecipients = await recipientRepo.save(recipients);
      await this.createMessageUserStates(
        {
          message,
          senderUserId: input.senderUserId,
          recipients: resolvedRecipients.map((user) => ({ id: user.id, email: user.email, relationType: user.relationType })),
        },
        manager,
      );
      await this.linkAttachmentsToMessage(input.senderUserId, message.id, input.attachmentIds ?? [], undefined, manager);
      await this.createAuditLog(
        {
          action: 'MESSAGE_FORWARDED',
          actorUserId: input.senderUserId,
          messageId: message.id,
          threadId: message.threadId,
          metadata: {
            parentMessageId: parent.id,
            recipients: resolvedRecipients.map((user) => user.email),
            to: resolvedRecipients.filter((item) => item.relationType === 'TO').map((item) => item.email),
            cc: resolvedRecipients.filter((item) => item.relationType === 'CC').map((item) => item.email),
            bcc: resolvedRecipients.filter((item) => item.relationType === 'BCC').map((item) => item.email),
          },
        },
        manager,
      );
      return { message, thread, recipients: savedRecipients };
    });
    await this.emitMessageRealtimeToRecipients(input.senderUserId, txResult.message, txResult.recipients);
    return { id: txResult.message.id, threadId: txResult.thread.id, recipients: txResult.recipients.length };
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
        originModule,
        sourceEntityType: null,
        sourceEntityId: null,
        lastMessageAt: now,
      }),
    );
    const draft = await this.messageRepository.save(
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
        bodyHtml: this.normalizeHtmlBody(input.bodyHtml ?? ''),
        bodyText: this.toBodyText(input.bodyHtml ?? ''),
        bodyJson: { draftRecipients: input.recipients ?? '' },
        status: 'DRAFT',
        isDraft: true,
        draftExpiresAt,
        lastAutosavedAt: now,
        scheduledAt: null,
        sentAt: null,
      }),
    );
    await this.createAuditLog({
      action: 'DRAFT_CREATED',
      actorUserId: input.userId,
      messageId: draft.id,
      threadId: draft.threadId,
    });
    return draft;
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
      draft.bodyHtml = this.normalizeHtmlBody(input.bodyHtml);
      draft.bodyText = this.toBodyText(input.bodyHtml);
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
    draft.lastAutosavedAt = now;
    const saved = await this.messageRepository.save(draft);
    await this.createAuditLog({
      action: 'DRAFT_UPDATED',
      actorUserId: input.userId,
      messageId: saved.id,
      threadId: saved.threadId,
    });
    return { draft: saved, recipients: input.recipients ?? null };
  }

  async deleteDraft(userId: string, draftId: string) {
    const draft = await this.messageRepository.findOne({
      where: { id: draftId, createdByUserId: userId, isDraft: true, status: 'DRAFT' },
    });
    if (!draft) throw new NotFoundException('DRAFT_NOT_FOUND');
    draft.status = 'ARCHIVED';
    const saved = await this.messageRepository.save(draft);
    await this.createAuditLog({
      action: 'DRAFT_DISCARDED',
      actorUserId: userId,
      messageId: saved.id,
      threadId: saved.threadId,
    });
    return saved;
  }

  async sendDraft(userId: string, draftId: string, recipientsRaw?: string, attachmentIds: string[] = []) {
    const draft = await this.messageRepository.findOne({
      where: { id: draftId, createdByUserId: userId, isDraft: true, status: 'DRAFT' },
    });
    if (!draft) throw new NotFoundException('DRAFT_NOT_FOUND');
    if (draft.draftExpiresAt && draft.draftExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('DRAFT_EXPIRED');
    }
    const draftRecipients = String((draft.bodyJson as Record<string, unknown> | null)?.draftRecipients ?? '').trim();
    const { recipients: resolvedRecipients } = await this.resolveRecipientsByBucketsOrFail({
      recipients: (recipientsRaw ?? '').trim() || draftRecipients,
    });
    const txResult = await this.dataSource.transaction(async (manager) => {
      const messageRepo = manager.getRepository(MessageEntity);
      const recipientRepo = manager.getRepository(MessageRecipientEntity);
      draft.isDraft = false;
      draft.status = 'SENT';
      draft.sentAt = new Date();
      draft.draftExpiresAt = null;
      const sent = await messageRepo.save(draft);

      const recipients = resolvedRecipients.map((user) =>
        recipientRepo.create({
          messageId: sent.id,
          recipientUserId: user.id,
          recipientEmail: user.email,
          recipientType: user.relationType,
          deliveredAt: new Date(),
        }),
      );
      const savedRecipients = await recipientRepo.save(recipients);
      await this.createMessageUserStates(
        {
          message: sent,
          senderUserId: userId,
          recipients: resolvedRecipients.map((user) => ({ id: user.id, email: user.email, relationType: user.relationType })),
        },
        manager,
      );
      await this.linkAttachmentsToMessage(userId, sent.id, attachmentIds, draftId, manager);
      await this.createAuditLog(
        {
          action: 'DRAFT_SENT',
          actorUserId: userId,
          messageId: sent.id,
          threadId: sent.threadId,
          metadata: { recipients: resolvedRecipients.map((user) => user.email) },
        },
        manager,
      );
      return { sent, recipients: savedRecipients };
    });
    await this.emitMessageRealtimeToRecipients(userId, txResult.sent, txResult.recipients);
    return { id: txResult.sent.id, recipients: txResult.recipients.length };
  }

  async listMessages(
    userId: string,
    query: {
      folder?: 'inbox' | 'sent' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'drafts' | 'all';
      originModule?: string;
      q?: string;
      page?: number;
      limit?: number;
      read?: boolean;
      hasAttachments?: boolean;
      labelId?: string;
    },
  ) {
    await this.releaseDueSnoozedMessagesForUser(userId);
    await this.expireTrashForUser(userId);
    const folder = query.folder ?? 'inbox';
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);

    if (query.originModule) {
      await this.ensureCanAccessModule(userId, query.originModule);
    }

    if (folder === 'sent') {
      const qbSent = this.messageUserStateRepository
        .createQueryBuilder('mus')
        .innerJoin(MessageEntity, 'm', 'm.id = mus.message_id')
        .where('mus.user_id = :userId', { userId })
        .andWhere('mus.is_in_sent = true')
        .andWhere('mus.permanently_hidden_at IS NULL')
        .andWhere('m.is_draft = false');
      if (query.originModule) qbSent.andWhere('m.origin_module = :originModule', { originModule: query.originModule });
      if (query.q) {
        qbSent.andWhere(
          `(
            m.subject ILIKE :q
            OR m.body_text ILIKE :q
            OR EXISTS (
              SELECT 1
              FROM users sender_u
              WHERE sender_u.user_id = m.sender_user_id
                AND (sender_u.name ILIKE :q OR sender_u.email ILIKE :q)
            )
            OR EXISTS (
              SELECT 1
              FROM message_user_states mus2
              WHERE mus2.message_id = m.id
                AND mus2.recipient_email ILIKE :q
            )
            OR EXISTS (
              SELECT 1
              FROM message_attachments ma2
              WHERE ma2.message_id = m.id
                AND ma2.original_name ILIKE :q
            )
            OR EXISTS (
              SELECT 1
              FROM message_label_assignments mla2
              JOIN message_labels ml2 ON ml2.id = mla2.label_id
              WHERE mla2.message_user_state_id = mus.id
                AND mla2.user_id = :userId
                AND (ml2.name ILIKE :q OR ml2.key ILIKE :q)
            )
          )`,
          { q: `%${query.q}%`, userId },
        );
        await this.upsertSearchHistory(userId, query.q);
      }
      if (typeof query.hasAttachments === 'boolean') {
        if (query.hasAttachments) {
          qbSent.andWhere('EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)');
        } else {
          qbSent.andWhere('NOT EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)');
        }
      }
      const total = await qbSent.clone().getCount();
      const rows = await qbSent
        .clone()
        .select(['m.id AS message_id'])
        .orderBy('m.sent_at', 'DESC')
        .addOrderBy('m.created_at', 'DESC')
        .take(limit)
        .skip((page - 1) * limit)
        .getRawMany<{ message_id: string }>();
      const messageIds = rows.map((row) => row.message_id);
      const items = messageIds.length
        ? await this.messageRepository.find({ where: messageIds.map((id) => ({ id })) })
        : [];
      return { page, limit, total, items };
    }
    if (folder === 'drafts') {
      const [items, total] = await this.messageRepository.findAndCount({
        where: { createdByUserId: userId, isDraft: true, status: 'DRAFT' },
        order: { updatedAt: 'DESC' },
        take: limit,
        skip: (page - 1) * limit,
      });
      return { page, limit, total, items };
    }

    const qb = this.messageUserStateRepository
      .createQueryBuilder('mus')
      .innerJoin(MessageEntity, 'm', 'm.id = mus.message_id')
      .where('mus.user_id = :userId', { userId })
      .andWhere('mus.permanently_hidden_at IS NULL');

    if (query.labelId) {
      qb.innerJoin(
        MessageLabelAssignmentEntity,
        'mla',
        'mla.message_user_state_id = mus.id AND mla.label_id = :labelId',
        { labelId: query.labelId },
      );
    }

    if (folder !== 'all') {
      if (folder === 'trash') {
        qb.andWhere('mus.deleted_at IS NOT NULL');
      } else {
        qb.andWhere('mus.deleted_at IS NULL');
      }
      if (folder === 'archived') qb.andWhere('mus.is_archived = true');
      if (folder !== 'archived') qb.andWhere('mus.is_archived = false');
      if (folder === 'snoozed') qb.andWhere('mus.snoozed_until IS NOT NULL AND mus.snoozed_until > now()');
      if (folder !== 'snoozed') qb.andWhere('(mus.snoozed_until IS NULL OR mus.snoozed_until <= now())');
      if (folder === 'starred') qb.andWhere('mus.starred_at IS NOT NULL');
      if (folder === 'inbox') qb.andWhere('mus.is_in_inbox = true');
    }

    if (query.originModule) qb.andWhere('m.origin_module = :originModule', { originModule: query.originModule });
    if (query.q) {
      qb.andWhere(
        `(
          m.subject ILIKE :q
          OR m.body_text ILIKE :q
          OR EXISTS (
            SELECT 1
            FROM users sender_u
            WHERE sender_u.user_id = m.sender_user_id
              AND (sender_u.name ILIKE :q OR sender_u.email ILIKE :q)
          )
          OR EXISTS (
            SELECT 1
            FROM message_user_states mus2
            WHERE mus2.message_id = m.id
              AND mus2.recipient_email ILIKE :q
          )
          OR EXISTS (
            SELECT 1
            FROM message_attachments ma2
            WHERE ma2.message_id = m.id
              AND ma2.original_name ILIKE :q
          )
          OR EXISTS (
            SELECT 1
            FROM message_label_assignments mla2
            JOIN message_labels ml2 ON ml2.id = mla2.label_id
            WHERE mla2.message_user_state_id = mus.id
              AND mla2.user_id = :userId
              AND (ml2.name ILIKE :q OR ml2.key ILIKE :q)
          )
        )`,
        { q: `%${query.q}%`, userId },
      );
    }
    if (query.q) {
      await this.upsertSearchHistory(userId, query.q);
    }
    if (typeof query.read === 'boolean') {
      if (query.read) qb.andWhere('mus.read_at IS NOT NULL');
      else qb.andWhere('mus.read_at IS NULL');
    }
    if (typeof query.hasAttachments === 'boolean') {
      if (query.hasAttachments) {
        qb.andWhere('EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)');
      } else {
        qb.andWhere('NOT EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id)');
      }
    }

    qb.orderBy('m.sent_at', 'DESC').addOrderBy('m.created_at', 'DESC');

    const total = await qb.clone().getCount();

    const rows = await qb
      .clone()
      .select(['mus.id AS state_id', 'mus.message_id AS message_id'])
      .take(limit)
      .skip((page - 1) * limit)
      .getRawMany<{ state_id: string; message_id: string }>();

    const stateIds = rows.map((row) => row.state_id);
    const messageIds = rows.map((row) => row.message_id);

    const states = stateIds.length
      ? await this.messageUserStateRepository.find({
          where: stateIds.map((id) => ({ id })),
        })
      : [];
    const messages = messageIds.length
      ? await this.messageRepository.find({
          where: messageIds.map((id) => ({ id })),
        })
      : [];
    const senderIds = Array.from(new Set(messages.map((m) => m.senderUserId).filter(Boolean))) as string[];
    const senders = senderIds.length
      ? await this.userRepository.find({
          where: senderIds.map((id) => ({ id })),
          select: ['id', 'name', 'email'],
        })
      : [];
    const senderMap = new Map(senders.map((sender) => [sender.id, sender]));

    const stateMap = new Map(states.map((state) => [state.id, state]));
    const messageMap = new Map(messages.map((message) => [message.id, message]));
    const labelAssignments = stateIds.length
      ? await this.messageLabelAssignmentRepository.find({
          where: stateIds.map((id) => ({ messageUserStateId: id, userId })),
        })
      : [];
    const labelIds = Array.from(new Set(labelAssignments.map((assignment) => assignment.labelId)));
    const labels = labelIds.length
      ? await this.messageLabelRepository.find({
          where: labelIds.map((id) => ({ id })),
        })
      : [];
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
          recipient:
            (() => {
              const state = stateMap.get(row.state_id);
              if (!state) return null;
              return {
                id: state.id,
                messageId: state.messageId,
                recipientUserId: state.userId,
                recipientEmail: state.recipientEmail ?? '',
                recipientType:
                  state.relationType === 'CC'
                    ? 'CC'
                    : state.relationType === 'BCC'
                      ? 'BCC'
                      : 'TO',
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
          sender:
            (() => {
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

  async getMessageDetail(userId: string, id: string) {
    await this.releaseDueSnoozedMessagesForUser(userId);
    await this.expireTrashForUser(userId);
    const ownMessage = await this.messageRepository.findOne({ where: { id, senderUserId: userId } });
    if (ownMessage) {
      const sender = ownMessage.senderUserId
        ? await this.userRepository.findOne({
            where: { id: ownMessage.senderUserId },
            select: ['id', 'name', 'email'],
          })
        : null;
      const recipients = await this.messageUserStateRepository.find({ where: { messageId: ownMessage.id } });
      const attachments = await this.messageAttachmentRepository.find({
        where: { messageId: ownMessage.id },
      });
      const senderState = await this.messageUserStateRepository.findOne({
        where: { messageId: ownMessage.id, userId, relationType: 'SENDER' },
      });
      const labelAssignments = senderState
        ? await this.messageLabelAssignmentRepository.find({
            where: { messageUserStateId: senderState.id, userId },
          })
        : [];
      const labels = labelAssignments.length
        ? await this.messageLabelRepository.find({
            where: labelAssignments.map((assignment) => ({ id: assignment.labelId })),
          })
        : [];
      const thread = ownMessage.threadId
        ? await this.messageRepository.find({
            where: { threadId: ownMessage.threadId },
            order: { createdAt: 'ASC' },
          })
        : [ownMessage];
      return { recipient: senderState, message: ownMessage, sender, recipients, attachments, labels, thread };
    }

    const recipient =
      (await this.messageUserStateRepository.findOne({ where: { id, userId } })) ??
      (await this.messageUserStateRepository.findOne({ where: { messageId: id, userId } }));
    if (!recipient) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }
    if (recipient.permanentlyHiddenAt) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }

    const message = await this.messageRepository.findOne({ where: { id: recipient.messageId } });
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');
    await this.ensureCanAccessModule(userId, message.originModule);
    const sender = message.senderUserId
      ? await this.userRepository.findOne({
          where: { id: message.senderUserId },
          select: ['id', 'name', 'email'],
        })
      : null;
    const recipients = await this.messageUserStateRepository.find({ where: { messageId: message.id } });
    const attachments = await this.messageAttachmentRepository.find({
      where: { messageId: message.id },
    });
    const labelAssignments = await this.messageLabelAssignmentRepository.find({
      where: { messageUserStateId: recipient.id, userId },
    });
    const labels = labelAssignments.length
      ? await this.messageLabelRepository.find({
          where: labelAssignments.map((assignment) => ({ id: assignment.labelId })),
        })
      : [];

    if (!recipient.readAt) {
      recipient.readAt = new Date();
      recipient.openedAt = new Date();
      await this.messageUserStateRepository.save(recipient);
      await this.createAuditLog({
        action: 'MESSAGE_READ',
        actorUserId: userId,
        messageId: message.id,
        threadId: message.threadId,
      });
    }

    const thread = message.threadId
      ? await this.messageRepository.find({
          where: { threadId: message.threadId },
          order: { createdAt: 'ASC' },
        })
      : [message];

    return { recipient, message, sender, recipients, attachments, labels, thread };
  }

  async markMessageAsRead(userId: string, recipientId: string) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    if (!recipient.readAt) {
      recipient.readAt = new Date();
      recipient.openedAt = recipient.openedAt ?? new Date();
      await this.messageUserStateRepository.save(recipient);
      await this.createAuditLog({
        action: 'MESSAGE_READ',
        actorUserId: userId,
        messageId: recipient.messageId,
        threadId: recipient.threadId,
      });
    }
    return recipient;
  }

  async markMessageAsUnread(userId: string, recipientId: string) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    recipient.readAt = null;
    await this.createAuditLog({
      action: 'MESSAGE_UNREAD',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async toggleStarMessage(userId: string, recipientId: string, value: boolean) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    recipient.starredAt = value ? new Date() : null;
    await this.createAuditLog({
      action: value ? 'MESSAGE_STARRED' : 'MESSAGE_UNSTARRED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async deleteMessage(userId: string, recipientId: string) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    const now = new Date();
    recipient.deletedAt = now;
    recipient.trashExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    recipient.isArchived = false;
    recipient.isInInbox = false;
    await this.createAuditLog({
      action: 'MESSAGE_DELETED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async permanentlyDeleteMessage(userId: string, recipientId: string) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    if (!recipient.deletedAt) throw new BadRequestException('MESSAGE_NOT_IN_TRASH');
    recipient.permanentlyHiddenAt = new Date();
    return this.messageUserStateRepository.save(recipient);
  }

  async restoreMessage(userId: string, recipientId: string) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    recipient.deletedAt = null;
    recipient.trashExpiresAt = null;
    recipient.permanentlyHiddenAt = null;
    recipient.isInInbox = recipient.relationType !== 'SENDER';
    await this.createAuditLog({
      action: 'MESSAGE_RESTORED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async archiveMessage(userId: string, recipientId: string) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    recipient.isArchived = true;
    recipient.isInInbox = false;
    await this.createAuditLog({
      action: 'MESSAGE_ARCHIVED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async unarchiveMessage(userId: string, recipientId: string) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    recipient.isArchived = false;
    if (recipient.relationType !== 'SENDER') recipient.isInInbox = true;
    await this.createAuditLog({
      action: 'MESSAGE_UNARCHIVED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async snoozeMessage(userId: string, recipientId: string, snoozedUntilIso: string) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    const snoozedUntil = new Date(snoozedUntilIso);
    if (Number.isNaN(snoozedUntil.getTime()) || snoozedUntil.getTime() <= Date.now()) {
      throw new BadRequestException('SNOOZE_DATE_INVALID');
    }
    recipient.snoozedUntil = snoozedUntil;
    recipient.snoozedAt = new Date();
    recipient.isInInbox = false;
    await this.createAuditLog({
      action: 'MESSAGE_SNOOZED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
      metadata: { snoozedUntil: snoozedUntil.toISOString() },
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async unsnoozeMessage(userId: string, recipientId: string) {
    const recipient = await this.findMessageStateOrThrow(userId, recipientId);
    recipient.snoozedUntil = null;
    recipient.snoozedAt = null;
    if (recipient.relationType !== 'SENDER') recipient.isInInbox = true;
    await this.createAuditLog({
      action: 'MESSAGE_UNSNOOZED',
      actorUserId: userId,
      messageId: recipient.messageId,
      threadId: recipient.threadId,
    });
    return this.messageUserStateRepository.save(recipient);
  }

  async releaseDueSnoozedMessagesForUser(userId: string) {
    await this.messageUserStateRepository
      .createQueryBuilder()
      .update(MessageUserStateEntity)
      .set({ snoozedUntil: null, snoozedAt: null, isInInbox: true })
      .where('user_id = :userId', { userId })
      .andWhere('snoozed_until IS NOT NULL')
      .andWhere('snoozed_until <= now()')
      .execute();
  }

  async expireTrashForUser(userId: string) {
    await this.messageUserStateRepository
      .createQueryBuilder()
      .update(MessageUserStateEntity)
      .set({ permanentlyHiddenAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('deleted_at IS NOT NULL')
      .andWhere('trash_expires_at IS NOT NULL')
      .andWhere('trash_expires_at <= now()')
      .andWhere('permanently_hidden_at IS NULL')
      .execute();
  }

  async bulkUpdateMessages(
    userId: string,
    input: {
      messageRecipientIds?: string[];
      messageStateIds?: string[];
      action:
        | 'MARK_AS_READ'
        | 'MARK_AS_UNREAD'
        | 'DELETE'
        | 'STAR'
        | 'UNSTAR'
        | 'RESTORE'
        | 'ARCHIVE'
        | 'UNARCHIVE'
        | 'SNOOZE'
        | 'UNSNOOZE'
        | 'MOVE_TO_TRASH'
        | 'ASSIGN_LABEL'
        | 'REMOVE_LABEL';
      snoozedUntil?: string;
      labelId?: string;
    },
  ) {
    if (input.action === 'ASSIGN_LABEL' || input.action === 'REMOVE_LABEL') {
      if (!input.labelId) {
        throw new BadRequestException('LABEL_ID_REQUIRED');
      }
    }

    let parsedSnoozeDate: Date | null = null;
    if (input.action === 'SNOOZE') {
      if (!input.snoozedUntil) {
        throw new BadRequestException('SNOOZE_DATE_REQUIRED');
      }
      parsedSnoozeDate = new Date(input.snoozedUntil);
      if (Number.isNaN(parsedSnoozeDate.getTime()) || parsedSnoozeDate.getTime() <= Date.now()) {
        throw new BadRequestException('SNOOZE_DATE_INVALID');
      }
    }

    const rawIds = [...(input.messageRecipientIds ?? []), ...(input.messageStateIds ?? [])];
    const ids = Array.from(new Set(rawIds.filter(Boolean)));
    if (!ids.length) return { updated: 0 };
    const states = await this.messageUserStateRepository.find({ where: ids.map((id) => ({ id, userId })) });
    const own = states.filter((recipient) => recipient.userId === userId);
    const now = new Date();
    own.forEach((recipient) => {
      if (input.action === 'MARK_AS_READ') recipient.readAt = recipient.readAt ?? now;
      if (input.action === 'MARK_AS_UNREAD') recipient.readAt = null;
      if (input.action === 'DELETE' || input.action === 'MOVE_TO_TRASH') {
        recipient.deletedAt = now;
        recipient.trashExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        recipient.isArchived = false;
        recipient.isInInbox = false;
      }
      if (input.action === 'RESTORE') {
        recipient.deletedAt = null;
        recipient.trashExpiresAt = null;
        recipient.permanentlyHiddenAt = null;
        if (recipient.relationType !== 'SENDER') recipient.isInInbox = true;
      }
      if (input.action === 'STAR') recipient.starredAt = now;
      if (input.action === 'UNSTAR') recipient.starredAt = null;
      if (input.action === 'ARCHIVE') {
        recipient.isArchived = true;
        recipient.isInInbox = false;
      }
      if (input.action === 'UNARCHIVE') {
        recipient.isArchived = false;
        if (recipient.relationType !== 'SENDER') recipient.isInInbox = true;
      }
      if (input.action === 'UNSNOOZE') {
        recipient.snoozedUntil = null;
        recipient.snoozedAt = null;
      }
      if (input.action === 'SNOOZE' && parsedSnoozeDate) {
        recipient.snoozedUntil = parsedSnoozeDate;
        recipient.snoozedAt = now;
        recipient.isInInbox = false;
      }
    });
    await this.messageUserStateRepository.save(own);
    if (!own.length) {
      return { updated: 0 };
    }
    if (input.action === 'ASSIGN_LABEL' && input.labelId) {
      await Promise.all(own.map((state) => this.assignLabelsToState(state.id, userId, [input.labelId!])));
    }
    if (input.action === 'REMOVE_LABEL' && input.labelId) {
      await this.messageLabelAssignmentRepository
        .createQueryBuilder()
        .delete()
        .where('user_id = :userId', { userId })
        .andWhere('label_id = :labelId', { labelId: input.labelId })
        .andWhere('message_user_state_id IN (:...ids)', { ids: own.map((state) => state.id) })
        .execute();
    }
    return { updated: own.length };
  }

  async listSearchHistory(userId: string) {
    return this.messageSearchHistoryRepository.find({
      where: { userId },
      order: { lastUsedAt: 'DESC', createdAt: 'DESC' },
      take: 10,
    });
  }

  async saveSearchHistory(userId: string, query: string) {
    const normalized = query.trim();
    if (!normalized) {
      throw new BadRequestException('SEARCH_QUERY_REQUIRED');
    }
    await this.upsertSearchHistory(userId, normalized);
    return this.listSearchHistory(userId);
  }

  async deleteSearchHistory(userId: string, id: string) {
    const history = await this.messageSearchHistoryRepository.findOne({ where: { id, userId } });
    if (!history) {
      throw new NotFoundException('SEARCH_HISTORY_NOT_FOUND');
    }
    await this.messageSearchHistoryRepository.delete({ id });
    return { deleted: true };
  }

  async assignLabelToMessage(userId: string, messageId: string, labelId: string) {
    const state =
      (await this.messageUserStateRepository.findOne({
        where: { messageId, userId },
      })) ??
      (await this.messageUserStateRepository.findOne({
        where: { id: messageId, userId },
      }));
    if (!state) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }
    await this.assignLabelsToState(state.id, userId, [labelId]);
    await this.createAuditLog({
      action: 'LABEL_ASSIGNED',
      actorUserId: userId,
      messageId: state.messageId,
      threadId: state.threadId,
      metadata: { labelId },
    });
    return { assigned: true };
  }

  async removeLabelFromMessage(userId: string, messageId: string, labelId: string) {
    const state =
      (await this.messageUserStateRepository.findOne({
        where: { messageId, userId },
      })) ??
      (await this.messageUserStateRepository.findOne({
        where: { id: messageId, userId },
      }));
    if (!state) {
      throw new NotFoundException('MESSAGE_NOT_FOUND');
    }
    await this.messageLabelAssignmentRepository
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId', { userId })
      .andWhere('label_id = :labelId', { labelId })
      .andWhere('message_user_state_id = :stateId', { stateId: state.id })
      .execute();
    await this.createAuditLog({
      action: 'LABEL_REMOVED',
      actorUserId: userId,
      messageId: state.messageId,
      threadId: state.threadId,
      metadata: { labelId },
    });
    return { removed: true };
  }

  private validateAttachmentOrFail(fileName: string, mimeType: string, size: number) {
    const extension = path.extname(fileName).toLowerCase();
    if (!this.allowedAttachmentExtensions.has(extension)) {
      throw new BadRequestException('ATTACHMENT_EXTENSION_NOT_ALLOWED');
    }
    if (!this.allowedAttachmentMimeTypes.has(mimeType)) {
      throw new BadRequestException('ATTACHMENT_MIME_NOT_ALLOWED');
    }
    if (size > this.maxAttachmentSizeBytes) {
      throw new BadRequestException('ATTACHMENT_TOO_LARGE');
    }
  }

  private async linkAttachmentsToMessage(
    userId: string,
    messageId: string,
    attachmentIds: string[],
    draftId?: string,
    manager?: EntityManager,
  ) {
    const attachmentRepo = manager ? manager.getRepository(MessageAttachmentEntity) : this.messageAttachmentRepository;
    const ids = Array.from(new Set((attachmentIds ?? []).filter(Boolean)));
    const whereBase = ids.length
      ? ids.map((id) => ({ id, uploadedByUserId: userId }))
      : draftId
        ? [{ draftId, uploadedByUserId: userId }]
        : [];
    if (!whereBase.length) return;

    const attachments = await attachmentRepo.find({
      where: whereBase,
    });
    if (!attachments.length) return;

    attachments.forEach((attachment) => {
      attachment.messageId = messageId;
      attachment.draftId = null;
    });
    await attachmentRepo.save(attachments);
  }

  private async ensureAttachmentAccessOrFail(userId: string, attachment: MessageAttachmentEntity) {
    if (attachment.uploadedByUserId === userId) return;
    const targetMessageId = attachment.messageId ?? attachment.draftId;
    if (!targetMessageId) {
      throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
    }
    const canAccess = await this.ensureMessageParticipant(userId, targetMessageId);
    if (!canAccess) {
      throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
    }
    const relatedMessage = await this.messageRepository.findOne({ where: { id: targetMessageId } });
    if (relatedMessage) {
      const requiredPermissions = this.notificationModulePermissions[relatedMessage.originModule] ?? ['page.notifications.view'];
      const allowed = await this.accessControlPort.canDownloadAttachment(userId, requiredPermissions);
      if (!allowed) {
        throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
      }
    }
  }

  async uploadAttachment(input: {
    userId: string;
    fileName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
    messageId?: string;
    draftId?: string;
  }) {
    if (!input.fileName || !input.mimeType || !input.buffer?.length) {
      throw new BadRequestException('ATTACHMENT_FILE_REQUIRED');
    }
    if (!input.messageId && !input.draftId) {
      throw new BadRequestException('ATTACHMENT_TARGET_REQUIRED');
    }

    this.validateAttachmentOrFail(input.fileName, input.mimeType, input.size);

    if (input.messageId) {
      const canAccess = await this.ensureMessageParticipant(input.userId, input.messageId);
      if (!canAccess) {
        throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
      }
    }

    if (input.draftId) {
      const draft = await this.messageRepository.findOne({
        where: { id: input.draftId, createdByUserId: input.userId, isDraft: true, status: 'DRAFT' },
      });
      if (!draft) {
        throw new ForbiddenException('ATTACHMENT_ACCESS_DENIED');
      }
    }

    await fs.mkdir(this.attachmentStorageDir, { recursive: true });
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(input.fileName).toLowerCase()}`;
    const storageKey = path.join(this.attachmentStorageDir, storedName);
    await fs.writeFile(storageKey, input.buffer);

    const saved = await this.messageAttachmentRepository.save(
      this.messageAttachmentRepository.create({
        messageId: input.messageId ?? null,
        draftId: input.draftId ?? null,
        originalName: input.fileName,
        storedName,
        mimeType: input.mimeType,
        sizeBytes: String(input.size),
        storageKey,
        uploadedByUserId: input.userId,
      }),
    );

    await this.createAuditLog({
      action: 'ATTACHMENT_UPLOADED',
      actorUserId: input.userId,
      messageId: input.messageId ?? input.draftId ?? null,
      metadata: {
        attachmentId: saved.id,
        originalName: saved.originalName,
        sizeBytes: saved.sizeBytes,
      },
    });

    return {
      id: saved.id,
      name: saved.originalName,
      mimeType: saved.mimeType,
      sizeBytes: Number(saved.sizeBytes),
      messageId: saved.messageId,
      draftId: saved.draftId,
      createdAt: saved.createdAt,
    };
  }

  async downloadAttachment(userId: string, attachmentId: string) {
    const attachment = await this.messageAttachmentRepository.findOne({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');
    await this.ensureAttachmentAccessOrFail(userId, attachment);
    const fileBuffer = await fs.readFile(attachment.storageKey);
    return {
      fileName: attachment.originalName,
      mimeType: attachment.mimeType,
      buffer: fileBuffer,
    };
  }

  async deleteAttachment(userId: string, attachmentId: string) {
    const attachment = await this.messageAttachmentRepository.findOne({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('ATTACHMENT_NOT_FOUND');
    await this.ensureAttachmentAccessOrFail(userId, attachment);

    await this.messageAttachmentRepository.delete({ id: attachment.id });
    try {
      await fs.unlink(attachment.storageKey);
    } catch {
      // Archivo puede no existir; no bloquea la eliminacion logica.
    }

    await this.createAuditLog({
      action: 'ATTACHMENT_REMOVED',
      actorUserId: userId,
      messageId: attachment.messageId ?? attachment.draftId ?? null,
      metadata: { attachmentId },
    });

    return { deleted: true };
  }

  async listMyNotifications(userId: string, limit = 20, cursor?: string) {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const qb = this.messageUserStateRepository
      .createQueryBuilder('mus')
      .innerJoin(MessageEntity, 'm', 'm.id = mus.message_id')
      .where('mus.user_id = :userId', { userId })
      .andWhere('mus.permanently_hidden_at IS NULL')
      .andWhere('mus.deleted_at IS NULL')
      .andWhere('mus.is_archived = false')
      .andWhere('(mus.snoozed_until IS NULL OR mus.snoozed_until <= now())')
      .orderBy('coalesce(m.sent_at, m.created_at)', 'DESC')
      .addOrderBy('mus.created_at', 'DESC')
      .take(normalizedLimit);

    if (cursor) {
      qb.andWhere('coalesce(m.sent_at, m.created_at) < :cursor', { cursor: new Date(cursor) });
    }

    const rows = await qb.select(['mus.id AS state_id', 'mus.message_id AS message_id']).getRawMany<{ state_id: string; message_id: string }>();
    if (!rows.length) return [];

    const stateIds = rows.map((row) => row.state_id);
    const messageIds = rows.map((row) => row.message_id);
    const states = await this.messageUserStateRepository.find({ where: stateIds.map((id) => ({ id })) });
    const messages = await this.messageRepository.find({ where: messageIds.map((id) => ({ id })) });
    const stateMap = new Map(states.map((state) => [state.id, state]));
    const messageMap = new Map(messages.map((message) => [message.id, message]));

    return rows
      .map((row) => {
        const state = stateMap.get(row.state_id);
        const message = messageMap.get(row.message_id);
        if (!state || !message) return null;
        return this.toNotificationResponse(state, message);
      })
      .filter((item): item is ReturnType<NotificationsService['toNotificationResponse']> => Boolean(item));
  }

  async getUnreadCount(userId: string) {
    const unread = await this.messageUserStateRepository
      .createQueryBuilder('mus')
      .where('mus.user_id = :userId', { userId })
      .andWhere('mus.read_at IS NULL')
      .andWhere('mus.permanently_hidden_at IS NULL')
      .andWhere('mus.deleted_at IS NULL')
      .andWhere('mus.is_archived = false')
      .andWhere('(mus.snoozed_until IS NULL OR mus.snoozed_until <= now())')
      .getCount();

    const unseen = await this.messageUserStateRepository
      .createQueryBuilder('mus')
      .where('mus.user_id = :userId', { userId })
      .andWhere('mus.opened_at IS NULL')
      .andWhere('mus.permanently_hidden_at IS NULL')
      .andWhere('mus.deleted_at IS NULL')
      .andWhere('mus.is_archived = false')
      .andWhere('(mus.snoozed_until IS NULL OR mus.snoozed_until <= now())')
      .getCount();

    return { unread, unseen };
  }

  async getMyNotificationDetail(userId: string, recipientId: string) {
    const state = await this.findMessageStateOrThrow(userId, recipientId);
    const message = await this.messageRepository.findOne({ where: { id: state.messageId } });
    if (!message) throw new NotFoundException('Notification not found');
    return this.toNotificationResponse(state, message);
  }

  async markAsSeen(userId: string, recipientId: string) {
    const state = await this.findMessageStateOrThrow(userId, recipientId);
    if (!state.openedAt) {
      state.openedAt = new Date();
      await this.messageUserStateRepository.save(state);
      const message = await this.messageRepository.findOne({ where: { id: state.messageId } });
      if (message) {
        this.realtimeService.emitToUser(userId, 'notification.seen', this.toNotificationResponse(state, message));
      }
      await this.emitUnreadCountUpdated(userId);
    }
    const message = await this.messageRepository.findOne({ where: { id: state.messageId } });
    if (!message) throw new NotFoundException('Notification not found');
    return this.toNotificationResponse(state, message);
  }

  async markAsRead(userId: string, recipientId: string) {
    const row = await this.findMessageStateOrThrow(userId, recipientId);
    const now = new Date();
    if (!row.openedAt) row.openedAt = now;
    if (!row.readAt) row.readAt = now;
    await this.messageUserStateRepository.save(row);
    const message = await this.messageRepository.findOne({ where: { id: row.messageId } });
    if (!message) throw new NotFoundException('Notification not found');
    this.realtimeService.emitToUser(userId, 'notification.read', this.toNotificationResponse(row, message));
    await this.emitUnreadCountUpdated(userId);
    return this.toNotificationResponse(row, message);
  }

  async markAllAsRead(userId: string) {
    const rows = await this.messageUserStateRepository
      .createQueryBuilder('mus')
      .where('mus.user_id = :userId', { userId })
      .andWhere('mus.read_at IS NULL')
      .andWhere('mus.permanently_hidden_at IS NULL')
      .andWhere('mus.deleted_at IS NULL')
      .andWhere('mus.is_archived = false')
      .getMany();

    if (!rows.length) return { updated: 0 };

    const now = new Date();
    rows.forEach((row) => {
      row.openedAt = row.openedAt ?? now;
      row.readAt = now;
    });
    await this.messageUserStateRepository.save(rows);
    this.realtimeService.emitToUser(userId, 'notification.updated', { type: 'READ_ALL' });
    await this.emitUnreadCountUpdated(userId);
    return { updated: rows.length };
  }

  async archive(userId: string, recipientId: string) {
    const row = await this.findMessageStateOrThrow(userId, recipientId);
    row.isArchived = true;
    row.isInInbox = false;
    await this.messageUserStateRepository.save(row);
    const message = await this.messageRepository.findOne({ where: { id: row.messageId } });
    if (!message) throw new NotFoundException('Notification not found');
    this.realtimeService.emitToUser(userId, 'notification.archived', this.toNotificationResponse(row, message));
    await this.emitUnreadCountUpdated(userId);
    return this.toNotificationResponse(row, message);
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
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
    actionUrl?: string | null;
    actionLabel?: string | null;
    metadata?: Record<string, unknown> | null;
    isSystem?: boolean;
    showAsToast?: boolean;
    sourceModule?: string | null;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
  }): Promise<Array<{ userId: string; recipientId: string }>> {
    const recipientUserIds = Array.from(new Set(input.recipientUserIds.filter(Boolean)));
    if (!recipientUserIds.length) return [];

    const users = await this.userRepository.findBy({ id: In(recipientUserIds) });
    if (!users.length) return [];

    const originModule = (input.sourceModule ?? 'system').toLowerCase();
    const subject = input.title?.trim() || 'Notificacion del sistema';
    const bodyText = input.message?.trim() || '';
    const bodyHtml = `<p>${bodyText}</p>`;

    const thread = await this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        subject,
        createdByUserId: null,
        originModule,
        sourceEntityType: input.sourceEntityType ?? null,
        sourceEntityId: this.toUuidOrNull(input.sourceEntityId ?? null),
        lastMessageAt: new Date(),
      }),
    );

    const systemMessage = await this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        parentMessageId: null,
        kind: 'SYSTEM_NOTIFICATION',
        originModule,
        sourceEntityType: input.sourceEntityType ?? null,
        sourceEntityId: this.toUuidOrNull(input.sourceEntityId ?? null),
        senderType: 'SYSTEM',
        senderUserId: null,
        createdByUserId: null,
        subject,
        bodyHtml,
        bodyText,
        bodyJson: input.metadata ?? {},
        status: 'SENT',
        isDraft: false,
        draftExpiresAt: null,
        lastAutosavedAt: null,
        scheduledAt: null,
        sentAt: new Date(),
      }),
    );

    const savedStates = await this.messageUserStateRepository.save(
      users.map((user) =>
        this.messageUserStateRepository.create({
          messageId: systemMessage.id,
          threadId: thread.id,
          userId: user.id,
          relationType: 'SYSTEM_RECIPIENT',
          recipientEmail: user.email,
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
          deliveredAt: new Date(),
          openedAt: null,
        }),
      ),
    );

    const createdRecipients: Array<{ userId: string; recipientId: string }> = savedStates.map((state) => ({
      userId: state.userId,
      recipientId: state.id,
    }));

    for (const state of savedStates) {
      const payload = this.toNotificationResponse(state, systemMessage);
      payload.notification = {
        ...payload.notification,
        type: input.type,
        category: input.category,
        priority: input.priority ?? 'NORMAL',
        actionUrl: input.actionUrl ?? null,
        actionLabel: input.actionLabel ?? null,
        metadata: { ...(payload.notification.metadata ?? {}), ...(input.metadata ?? {}) },
        showAsToast: input.showAsToast ?? true,
      };
      this.realtimeService.emitToUser(state.userId, 'notification.created', payload);
    }

    await this.createAuditLog({
      action: 'SYSTEM_NOTIFICATION_CREATED',
      actorUserId: null,
      messageId: systemMessage.id,
      threadId: systemMessage.threadId,
      metadata: {
        type: input.type,
        category: input.category,
        recipients: users.map((user) => user.email),
      },
    });

    return createdRecipients;
  }

  private async emitUnreadCountUpdated(userId: string) {
    const count = await this.getUnreadCount(userId);
    this.realtimeService.emitToUser(userId, 'notification.unread_count_updated', count);
  }

  private toNotificationResponse(state: MessageUserStateEntity, message: MessageEntity) {
    const metadata = (message.bodyJson ?? {}) as Record<string, unknown>;
    const sourceModule = message.originModule ?? null;
    return {
      recipientId: state.id,
      status: state.isArchived
        ? 'ARCHIVED'
        : state.deletedAt
          ? 'DELETED'
          : state.readAt
            ? 'READ'
            : state.openedAt
              ? 'SEEN'
              : 'UNREAD',
      seenAt: state.openedAt,
      readAt: state.readAt,
      deliveredAt: state.deliveredAt,
      archivedAt: state.isArchived ? state.updatedAt : null,
      dismissedAt: null,
      createdAt: state.createdAt,
      notification: {
        id: message.id,
        type: String(metadata?.type ?? message.kind ?? 'SYSTEM_MESSAGE'),
        category: String(metadata?.category ?? (sourceModule === 'purchases' ? 'PURCHASES' : 'SYSTEM')),
        title: message.subject,
        message: message.bodyText,
        priority: String(metadata?.priority ?? 'NORMAL'),
        sourceModule,
        sourceEntityType: message.sourceEntityType,
        sourceEntityId: message.sourceEntityId,
        actionUrl: typeof metadata?.actionUrl === 'string' ? metadata.actionUrl : null,
        actionLabel: typeof metadata?.actionLabel === 'string' ? metadata.actionLabel : null,
        metadata,
        isSystem: message.senderType === 'SYSTEM',
        showAsToast: metadata?.showAsToast !== false,
        createdAt: message.createdAt,
      },
    };
  }
}
