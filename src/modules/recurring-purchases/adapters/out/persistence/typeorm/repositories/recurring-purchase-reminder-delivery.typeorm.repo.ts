import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import {
  RecurringPurchaseReminderDeliveryKey,
  RecurringPurchaseReminderDeliveryRepository,
} from "src/modules/recurring-purchases/domain/ports/recurring-purchase-reminder-delivery.repository";
import { RecurringPurchaseReminderDeliveryEntity } from "../entities/recurring-purchase-reminder-delivery.entity";

@Injectable()
export class RecurringPurchaseReminderDeliveryTypeormRepository
  implements RecurringPurchaseReminderDeliveryRepository
{
  constructor(
    @InjectRepository(RecurringPurchaseReminderDeliveryEntity)
    private readonly repo: Repository<RecurringPurchaseReminderDeliveryEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(RecurringPurchaseReminderDeliveryEntity);
  }

  async hasDelivery(key: RecurringPurchaseReminderDeliveryKey, tx?: TransactionContext) {
    const count = await this.getRepo(tx).count({
      where: {
        templateId: key.templateId,
        periodKey: key.periodKey,
        dueDate: key.dueDate,
        daysBefore: key.daysBefore,
      },
    });
    return count > 0;
  }

  async recordDelivery(
    delivery: RecurringPurchaseReminderDeliveryKey & { sentAt: Date },
    tx?: TransactionContext,
  ) {
    await this.getRepo(tx)
      .createQueryBuilder()
      .insert()
      .into(RecurringPurchaseReminderDeliveryEntity)
      .values({
        templateId: delivery.templateId,
        periodKey: delivery.periodKey,
        dueDate: delivery.dueDate,
        daysBefore: delivery.daysBefore,
        sentAt: delivery.sentAt,
      })
      .orIgnore()
      .execute();
  }
}
