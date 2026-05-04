import { Provider } from "@nestjs/common";
import { AddPurchaseOrderItemUsecase } from "../usecases/purchase-order-item/add.usecase";
import { ListPurchaseOrderItemsUsecase } from "../usecases/purchase-order-item/list.usecase";
import { RemovePurchaseOrderItemUsecase } from "../usecases/purchase-order-item/remove.usecase";
import { CancelPurchaseOrderUsecase } from "../usecases/purchase-order/cancel.usecase";
import { CreatePurchaseOrderUsecase } from "../usecases/purchase-order/create.usecase";
import { GetPurchaseOrderUsecase } from "../usecases/purchase-order/get-by-id.usecase";
import { PostInventoryFromPurchaseUsecase } from "../usecases/purchase-order/Inventory-purchase.usecase";
import { ListPurchaseOrdersUsecase } from "../usecases/purchase-order/list.usecase";
import { RunExpectedAtUsecase } from "../usecases/purchase-order/run-expected-at.usecase";
import { SetPurchaseOrderActiveUsecase } from "../usecases/purchase-order/set-active.usecase";
import { SetSentPurchaseOrderUsecase } from "../usecases/purchase-order/set-sent.usecase";
import { UpdatePurchaseOrderUsecase } from "../usecases/purchase-order/update.usecase";
import { ExportPurchaseOrdersExcelUsecase } from "../usecases/purchase-order/export-excel.usecase";
import { PurchaseOrderExpectedBootstrap } from "../jobs/purchase-order-expected-bootstrap";
import { PurchaseOrderExpectedScheduler } from "../jobs/purchase-order-expected-scheduler";
import { GetPurchaseOrderSearchStateUsecase } from "../usecases/purchase-search/get-state.usecase";
import { SavePurchaseOrderSearchMetricUsecase } from "../usecases/purchase-search/save-metric.usecase";
import { DeletePurchaseOrderSearchMetricUsecase } from "../usecases/purchase-search/delete-metric.usecase";
import { PurchaseUnitConversionService } from "../services/purchase-unit-conversion.service";
import { ConfirmPurchaseReceptionUsecase } from "../usecases/purchase-order/confirm-reception.usecase";

export const purchasesUsecasesProviders: Provider[] = [
  CreatePurchaseOrderUsecase,
  UpdatePurchaseOrderUsecase,
  ListPurchaseOrdersUsecase,
  GetPurchaseOrderUsecase,
  SetPurchaseOrderActiveUsecase,
  AddPurchaseOrderItemUsecase,
  ListPurchaseOrderItemsUsecase,
  RemovePurchaseOrderItemUsecase,
  RunExpectedAtUsecase,
  PurchaseOrderExpectedScheduler,
  PurchaseOrderExpectedBootstrap,
  SetSentPurchaseOrderUsecase,
  CancelPurchaseOrderUsecase,
  PostInventoryFromPurchaseUsecase,
  GetPurchaseOrderSearchStateUsecase,
  SavePurchaseOrderSearchMetricUsecase,
  DeletePurchaseOrderSearchMetricUsecase,
  PurchaseUnitConversionService,
  ExportPurchaseOrdersExcelUsecase,
  ConfirmPurchaseReceptionUsecase,
];
