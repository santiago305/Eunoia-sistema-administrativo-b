import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountsPayableModule } from "src/modules/accounts-payable";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { MailModule } from "src/modules/mail";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { PurchasesModule } from "src/modules/purchases/infrastructure/purchases.module";
import { RecurringPurchasesController } from "./adapters/in/controllers/recurring-purchases.controller";
import { RecurringPurchaseReminderDeliveryEntity } from "./adapters/out/persistence/typeorm/entities/recurring-purchase-reminder-delivery.entity";
import { RecurringPurchaseTemplateEntity } from "./adapters/out/persistence/typeorm/entities/recurring-purchase-template.entity";
import { recurringPurchasesModuleProviders } from "./composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecurringPurchaseTemplateEntity,
      RecurringPurchaseReminderDeliveryEntity,
      PurchaseHistoryEventEntity,
    ]),
    PurchasesModule,
    AccountsPayableModule,
    PaymentsModule,
    MailModule,
    AccessControlModule,
  ],
  controllers: [RecurringPurchasesController],
  providers: [...recurringPurchasesModuleProviders],
})
export class RecurringPurchasesModule {}
