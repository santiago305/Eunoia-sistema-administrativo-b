import { Provider } from "@nestjs/common";
import { CreateSupplierUsecase } from "../usecases/supplier/create.usecase";
import { GetSupplierUsecase } from "../usecases/supplier/get-by-id.usecase";
import { ListSuppliersUsecase } from "../usecases/supplier/list.usecase";
import { SetSupplierActiveUsecase } from "../usecases/supplier/set-active.usecase";
import { UpdateSupplierUsecase } from "../usecases/supplier/update.usecase";
import { DeleteSupplierSearchMetricUsecase } from "../usecases/supplier-search/delete-metric.usecase";
import { GetSupplierSearchStateUsecase } from "../usecases/supplier-search/get-state.usecase";
import { SaveSupplierSearchMetricUsecase } from "../usecases/supplier-search/save-metric.usecase";
import { CreateSupplierSkuUsecase } from "../usecases/supplier-sku/create.usecase";
import { GetSupplierSkuUsecase } from "../usecases/supplier-sku/get-by-id.usecase";
import { ListSupplierSkusUsecase } from "../usecases/supplier-sku/list.usecase";
import { UpdateSupplierSkuUsecase } from "../usecases/supplier-sku/update.usecase";

export const suppliersUsecasesProviders: Provider[] = [
  CreateSupplierUsecase,
  UpdateSupplierUsecase,
  SetSupplierActiveUsecase,
  ListSuppliersUsecase,
  GetSupplierUsecase,
  CreateSupplierSkuUsecase,
  UpdateSupplierSkuUsecase,
  GetSupplierSkuUsecase,
  ListSupplierSkusUsecase,
  GetSupplierSearchStateUsecase,
  SaveSupplierSearchMetricUsecase,
  DeleteSupplierSearchMetricUsecase,
];
