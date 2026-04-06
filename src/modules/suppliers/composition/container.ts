import { Provider } from "@nestjs/common";
import { CLOCK } from "src/modules/inventory/application/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { SupplierTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/supplier.typeorm.repo";
import { SupplierVariantTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/supplier-variant.typeorm.repo";
import { suppliersUsecasesProviders } from "../application/providers/suppliers-usecases.providers";
import { SUPPLIER_REPOSITORY } from "../domain/ports/supplier.repository";
import { SUPPLIER_VARIANT_REPOSITORY } from "../domain/ports/supplier-variant.repository";

export const suppliersModuleProviders: Provider[] = [
  ...suppliersUsecasesProviders,
  { provide: SUPPLIER_REPOSITORY, useClass: SupplierTypeormRepository },
  { provide: SUPPLIER_VARIANT_REPOSITORY, useClass: SupplierVariantTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];
