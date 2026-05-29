import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_SEARCH } from "src/modules/sale-orders/domain/ports/sale-order-search.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SaleOrderTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo";
import { SaleOrderSearchTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-search.typeorm.repo";
import { SaleOrderItemTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-item.typeorm.repo";
import { SaleOrderItemComponentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-item-component.typeorm.repo";
import { SalePaymentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-payment.typeorm.repo";
import { CreateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/create.usecase";
import { GetSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get.usecase";
import { ListSaleOrdersUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list.usecase";
import { GetSaleOrderComponentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-components.usecase";
import { GetSaleOrderItemComponentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/get-item-components.usecase";
import { UpdateSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/update.usecase";
import { GetSaleOrderSearchStateUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/get-state.usecase";
import { SaveSaleOrderSearchMetricUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/save-metric.usecase";
import { DeleteSaleOrderSearchMetricUsecase } from "src/modules/sale-orders/application/usecases/sale-order-search/delete-metric.usecase";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UpdateSaleOrdersDeliveryDateTodayJob } from "src/modules/sale-orders/application/jobs/update-sale-orders-deliverydate-today.job";
import { SaleOrdersJobsScheduler } from "src/modules/sale-orders/infrastructure/jobs/sale-orders-jobs.scheduler";
import { UpdateSaleOrderStatusUsecase } from "src/modules/sale-orders/application/usecases/sale-order/update-status.usecase";
import { CancelSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/cancel.usecase";
import { ConfirmSaleOrderDeliveryUsecase } from "src/modules/sale-orders/application/usecases/sale-order/confirm-delivery.usecase";
import { ListSaleOrderPaymentsUsecase } from "src/modules/sale-orders/application/usecases/sale-order/list-payments.usecase";
import { AddSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/add-payment.usecase";
import { DeleteSaleOrderPaymentUsecase } from "src/modules/sale-orders/application/usecases/sale-order/delete-payment.usecase";

export const saleOrdersModuleProviders = [
  { provide: SALE_ORDER_REPOSITORY, useClass: SaleOrderTypeormRepository },
  { provide: SALE_ORDER_ITEM_REPOSITORY, useClass: SaleOrderItemTypeormRepository },
  { provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY, useClass: SaleOrderItemComponentTypeormRepository },
  { provide: SALE_PAYMENT_REPOSITORY, useClass: SalePaymentTypeormRepository },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: SALE_ORDER_SEARCH, useClass: SaleOrderSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
  CreateSaleOrderUsecase,
  GetSaleOrderUsecase,
  UpdateSaleOrderUsecase,
  ListSaleOrdersUsecase,
  UpdateSaleOrderStatusUsecase,
  CancelSaleOrderUsecase,
  ConfirmSaleOrderDeliveryUsecase,
  ListSaleOrderPaymentsUsecase,
  AddSaleOrderPaymentUsecase,
  DeleteSaleOrderPaymentUsecase,
  GetSaleOrderComponentsUsecase,
  GetSaleOrderItemComponentsUsecase,
  GetSaleOrderSearchStateUsecase,
  SaveSaleOrderSearchMetricUsecase,
  DeleteSaleOrderSearchMetricUsecase,
  UpdateSaleOrdersDeliveryDateTodayJob,
  SaleOrdersJobsScheduler,
];
