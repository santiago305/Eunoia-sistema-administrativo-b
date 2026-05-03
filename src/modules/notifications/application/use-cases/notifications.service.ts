import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationRecipient } from '../../adapters/out/persistence/typeorm/entities/notification-recipient.entity';
import { Notification } from '../../adapters/out/persistence/typeorm/entities/notification.entity';
import { NotificationRealtimeService } from '../../infrastructure/realtime/notification-realtime.service';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { NotificationOutbox } from '../../adapters/out/persistence/typeorm/entities/notification-outbox.entity';
import { NotificationDeliveryAttempt } from '../../adapters/out/persistence/typeorm/entities/notification-delivery-attempt.entity';
import { NotificationQueueService } from '../../infrastructure/queue/notification-queue.service';

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
    private readonly realtimeService: NotificationRealtimeService,
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

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

    const notification = this.notificationRepository.create({
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
    const savedNotification = await this.notificationRepository.save(notification);

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
        userId,
        notificationId: savedNotification.id,
      },
      status: 'PENDING',
      attempts: 0,
    });
    const savedOutbox = await this.outboxRepository.save(outbox);
    await this.notificationQueueService.enqueueOutboxDelivery(savedOutbox.id);

    return this.getMyNotificationDetail(userId, savedRecipient.id);
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
        createdAt: row.notification.createdAt,
      },
    };
  }
}
