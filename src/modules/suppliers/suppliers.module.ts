// src/modules/suppliers/suppliers.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { CLOCK } from "src/modules/inventory/domain/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { CatalogModule } from "src/modules/catalog/infrastructure/catalog.module";
import { SuppliersController } from "./adapters/in/controllers/supplier.controller";
import { SupplierVariantsController } from "./adapters/in/controllers/supplier-variant.controller";
import { SupplierEntity } from "./adapters/out/persistence/typeorm/entities/supplier.entity";
import { SupplierVariantEntity } from "./adapters/out/persistence/typeorm/entities/supplier-variant.entity";
import { SupplierTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/supplier.typeorm.repo";
import { SupplierVariantTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/supplier-variant.typeorm.repo";
import { CreateSupplierUsecase } from "./application/usecases/supplier/create.usecase";
import { UpdateSupplierUsecase } from "./application/usecases/supplier/update.usecase";
import { SetSupplierActiveUsecase } from "./application/usecases/supplier/set-active.usecase";
import { ListSuppliersUsecase } from "./application/usecases/supplier/list.usecase";
import { GetSupplierUsecase } from "./application/usecases/supplier/get-by-id.usecase";
import { CreateSupplierVariantUsecase } from "./application/usecases/supplier-variant/create.usecase";
import { UpdateSupplierVariantUsecase } from "./application/usecases/supplier-variant/update.usecase";
import { GetSupplierVariantUsecase } from "./application/usecases/supplier-variant/get-by-id.usecase";
import { ListSupplierVariantsUsecase } from "./application/usecases/supplier-variant/list.usecase";
import { SUPPLIER_REPOSITORY } from "./domain/ports/supplier.repository";
import { SUPPLIER_VARIANT_REPOSITORY } from "./domain/ports/supplier-variant.repository";

@Module({
  imports: [TypeOrmModule.forFeature([SupplierEntity, SupplierVariantEntity]), CatalogModule],
  controllers: [SuppliersController, SupplierVariantsController],
  providers: [
    CreateSupplierUsecase,
    UpdateSupplierUsecase,
    SetSupplierActiveUsecase,
    ListSuppliersUsecase,
    GetSupplierUsecase,
    CreateSupplierVariantUsecase,
    UpdateSupplierVariantUsecase,
    GetSupplierVariantUsecase,
    ListSupplierVariantsUsecase,
    { provide: SUPPLIER_REPOSITORY, useClass: SupplierTypeormRepository },
    { provide: SUPPLIER_VARIANT_REPOSITORY, useClass: SupplierVariantTypeormRepository },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
    { provide: CLOCK, useValue: { now: () => new Date() } },
  ],
  exports: [SUPPLIER_REPOSITORY, SUPPLIER_VARIANT_REPOSITORY],
})
export class SuppliersModule {}
