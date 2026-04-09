import { Provider } from "@nestjs/common";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { SupplierTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/supplier.typeorm.repo";
import { SupplierSkuTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/supplier-sku.typeorm.repo";
import { suppliersUsecasesProviders } from "../application/providers/suppliers-usecases.providers";
import { SUPPLIER_REPOSITORY } from "../domain/ports/supplier.repository";
import { SUPPLIER_SKU_REPOSITORY } from "../domain/ports/supplier-sku.repository";

export const suppliersModuleProviders: Provider[] = [
  ...suppliersUsecasesProviders,
  { provide: SUPPLIER_REPOSITORY, useClass: SupplierTypeormRepository },
  { provide: SUPPLIER_SKU_REPOSITORY, useClass: SupplierSkuTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];

