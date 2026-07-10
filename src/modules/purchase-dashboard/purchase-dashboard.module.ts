import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountPayableEntity } from "src/modules/accounts-payable/adapters/out/persistence/typeorm/entities/account-payable.entity";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseOrderItemEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order-item.entity";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { ListingSearchMetricEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-metric.entity";
import { ListingSearchRecentEntity } from "src/shared/listing-search/adapters/out/persistence/typeorm/entities/listing-search-recent.entity";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { PurchaseDashboardController } from "./adapters/in/controllers/purchase-dashboard.controller";
import { PurchaseDashboardQueryTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/purchase-dashboard-query.typeorm.repo";
import { GetPurchaseDashboardByTypeUsecase } from "./application/usecases/get-purchase-dashboard-by-type.usecase";
import { GetPurchaseDashboardMonthlySpendingUsecase } from "./application/usecases/get-purchase-dashboard-monthly-spending.usecase";
import { GetPurchaseDashboardSummaryUsecase } from "./application/usecases/get-purchase-dashboard-summary.usecase";
import { GetOverduePaymentsUsecase } from "./application/usecases/get-overdue-payments.usecase";
import { GetUpcomingPaymentsUsecase } from "./application/usecases/get-upcoming-payments.usecase";
import { PURCHASE_DASHBOARD_QUERY_REPOSITORY } from "./domain/ports/purchase-dashboard-query.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrderEntity,
      PurchaseOrderItemEntity,
      PaymentDocumentEntity,
      AccountPayableEntity,
      ListingSearchRecentEntity,
      ListingSearchMetricEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [PurchaseDashboardController],
  providers: [
    GetPurchaseDashboardSummaryUsecase,
    GetPurchaseDashboardByTypeUsecase,
    GetPurchaseDashboardMonthlySpendingUsecase,
    GetUpcomingPaymentsUsecase,
    GetOverduePaymentsUsecase,
    {
      provide: PURCHASE_DASHBOARD_QUERY_REPOSITORY,
      useClass: PurchaseDashboardQueryTypeormRepository,
    },
    { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  ],
})
export class PurchaseDashboardModule {}
