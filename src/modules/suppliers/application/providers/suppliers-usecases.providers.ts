import { Provider } from "@nestjs/common";
import { CreateSupplierUsecase } from "../usecases/supplier/create.usecase";
import { GetSupplierUsecase } from "../usecases/supplier/get-by-id.usecase";
import { ListAllActiveSuppliersUsecase } from "../usecases/supplier/list-all-active.usecase";
import { ListSuppliersUsecase } from "../usecases/supplier/list.usecase";
import { SetSupplierActiveUsecase } from "../usecases/supplier/set-active.usecase";
import { UpdateSupplierUsecase } from "../usecases/supplier/update.usecase";
import { CreateSupplierVariantUsecase } from "../usecases/supplier-variant/create.usecase";
import { GetSupplierVariantUsecase } from "../usecases/supplier-variant/get-by-id.usecase";
import { ListSupplierVariantsUsecase } from "../usecases/supplier-variant/list.usecase";
import { UpdateSupplierVariantUsecase } from "../usecases/supplier-variant/update.usecase";

export const suppliersUsecasesProviders: Provider[] = [
  CreateSupplierUsecase,
  UpdateSupplierUsecase,
  SetSupplierActiveUsecase,
  ListSuppliersUsecase,
  GetSupplierUsecase,
  ListAllActiveSuppliersUsecase,
  CreateSupplierVariantUsecase,
  UpdateSupplierVariantUsecase,
  GetSupplierVariantUsecase,
  ListSupplierVariantsUsecase,
];
