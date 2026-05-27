import { DataSource, In } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { MessageEntity } from 'src/modules/mail/adapters/out/persistence/typeorm/entities/message.entity';
import { MessageThread } from 'src/modules/mail/adapters/out/persistence/typeorm/entities/message-thread.entity';
import { MessageUserStateEntity } from 'src/modules/mail/adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { MessageRecipientEntity } from 'src/modules/mail/adapters/out/persistence/typeorm/entities/message-recipient.entity';

const FALLBACK_TARGET_EMAIL = 'minecratf633@gmail.com';
const TOTAL_SYSTEM_MESSAGES = 80;

const MODULES = [
  'purchases',
  'production',
  'warehouse',
  'catalog',
  'supplies',
  'security',
  'roles',
  'providers',
  'system',
] as const;

export const seedSystemNotificationsForUser = async (dataSource: DataSource): Promise<void> => {
  const userRepo = dataSource.getRepository(User);
  const messageRepo = dataSource.getRepository(MessageEntity);
  const threadRepo = dataSource.getRepository(MessageThread);
  const stateRepo = dataSource.getRepository(MessageUserStateEntity);
  const recipientRepo = dataSource.getRepository(MessageRecipientEntity);

  const superAdmin = await userRepo.findOne({
    where: { isSuperAdmin: true, deleted: false },
    select: ['id', 'email'],
    order: { createdAt: 'ASC' },
  });
  const user = superAdmin ?? (await userRepo.findOne({ where: { email: FALLBACK_TARGET_EMAIL }, select: ['id', 'email'] }));
  if (!user) {
    console.warn(`seedSystemNotificationsForUser: no se encontro un usuario objetivo para notificaciones, se omite.`);
    return;
  }

  // Limpieza idempotente: elimina lote previo generado por este seed.
  const previousMessages = await messageRepo.find({
    where: { sourceEntityType: 'seed_system_notification', createdByUserId: user.id },
    select: ['id'],
  });
  const previousIds = previousMessages.map((m) => m.id);
  if (previousIds.length) {
    await stateRepo.delete({ messageId: In(previousIds), userId: user.id });
    await recipientRepo.delete({ messageId: In(previousIds), recipientUserId: user.id });
    await messageRepo.delete({ id: In(previousIds) });
  }

  const now = Date.now();
  for (let i = 0; i < TOTAL_SYSTEM_MESSAGES; i++) {
    const originModule = MODULES[i % MODULES.length];
    const sentAt = new Date(now - i * 15 * 60 * 1000);
    const subject = `[${originModule.toUpperCase()}] Notificacion de sistema ${i + 1}`;
    const bodyText = `Evento automatico #${i + 1} del modulo ${originModule}. Revisar detalle en la bandeja.`;
    const bodyHtml = `<p>${bodyText}</p>`;

    const thread = await threadRepo.save(
      threadRepo.create({
        subject,
        createdByUserId: user.id,
        originModule,
        sourceEntityType: 'seed_system_notification',
        sourceEntityId: null,
        lastMessageAt: sentAt,
      }),
    );

    const message = await messageRepo.save(
      messageRepo.create({
        threadId: thread.id,
        parentMessageId: null,
        kind: 'SYSTEM_NOTIFICATION',
        originModule,
        sourceEntityType: 'seed_system_notification',
        sourceEntityId: null,
        senderType: 'SYSTEM',
        senderUserId: null,
        createdByUserId: user.id,
        subject,
        bodyHtml,
        bodyText,
        bodyJson: {
          seeded: true,
          index: i + 1,
          targetEmail: user.email,
          originModule,
        },
        status: 'SENT',
        isDraft: false,
        draftExpiresAt: null,
        lastAutosavedAt: null,
        scheduledAt: null,
        sentAt,
      }),
    );

    await recipientRepo.save(
      recipientRepo.create({
        messageId: message.id,
        recipientUserId: user.id,
        recipientEmail: user.email,
        recipientType: 'TO',
        deliveredAt: sentAt,
      }),
    );

    await stateRepo.save(
      stateRepo.create({
        messageId: message.id,
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
        deliveredAt: sentAt,
        openedAt: null,
      }),
    );
  }

  console.log(`seedSystemNotificationsForUser: ${TOTAL_SYSTEM_MESSAGES} notificaciones creadas para ${user.email}.`);
};

