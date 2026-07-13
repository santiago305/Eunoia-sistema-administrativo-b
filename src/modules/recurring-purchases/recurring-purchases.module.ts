import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountsPayableModule } from "src/modules/accounts-payable";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { MailModule } from "src/modules/mail";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { PurchasesModule } from "src/modules/purchases/infrastructure/purchases.module";
import { SupplierEntity } from "src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
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
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
      SupplierEntity,
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
