import { Provider } from "@nestjs/common";
import { ProductionOrderExpectedBootstrap } from "../jobs/production-order-expected-bootstrap";
import { ProductionOrderExpectedScheduler } from "../jobs/production-order-expected-scheduler";
import { AddProductionOrderItem } from "../usecases/production-order/add-item.usecase";
import { BuildConsumptionFromRecipesUseCase } from "../usecases/production-order/build-consumption-from-recipes.usecase";
import { CancelProductionOrder } from "../usecases/production-order/cancel.usecase";
import { CloseProductionOrder } from "../usecases/production-order/close.usecase";
import { ConsumeReservedMaterialsUseCase } from "../usecases/production-order/consume-reserved-materials.usecase";
import { CreateProductionOrder } from "../usecases/production-order/create.usecase";
import { GetProductionOrder } from "../usecases/production-order/get-record.usecase";
import { ListProductionOrders } from "../usecases/production-order/list-orders.usecase";
import { PostProductionDocumentsUseCase } from "../usecases/production-order/post-production-documents.usecase";
import { RemoveProductionOrderItem } from "../usecases/production-order/remove-production-order-item.usecase";
import { RunProductionTimeUsecase } from "../usecases/production-order/run-production-time.usecase";
import { StartProductionOrder } from "../usecases/production-order/start.usecase";
import { UpdateProductionOrder } from "../usecases/production-order/update-production-order.usecase";
import { UpdateProductionWaste } from "../usecases/production-order/update-waste.usecase";

export const productionUsecasesProviders: Provider[] = [
  CreateProductionOrder,
  ListProductionOrders,
  GetProductionOrder,
  UpdateProductionOrder,
  StartProductionOrder,
  CloseProductionOrder,
  CancelProductionOrder,
  AddProductionOrderItem,
  RemoveProductionOrderItem,
  UpdateProductionWaste,
  BuildConsumptionFromRecipesUseCase,
  ConsumeReservedMaterialsUseCase,
  PostProductionDocumentsUseCase,
  RunProductionTimeUsecase,
  ProductionOrderExpectedScheduler,
  ProductionOrderExpectedBootstrap,
];
