import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogModule } from "src/modules/catalog/infrastructure/catalog.module";
import { SuppliersController } from "./adapters/in/controllers/supplier.controller";
import { SupplierVariantsController } from "./adapters/in/controllers/supplier-variant.controller";
import { SupplierEntity } from "./adapters/out/persistence/typeorm/entities/supplier.entity";
import { SupplierVariantEntity } from "./adapters/out/persistence/typeorm/entities/supplier-variant.entity";
import { SUPPLIER_REPOSITORY } from "./domain/ports/supplier.repository";
import { SUPPLIER_VARIANT_REPOSITORY } from "./domain/ports/supplier-variant.repository";
import { suppliersModuleProviders } from "./composition/container";

@Module({
  imports: [TypeOrmModule.forFeature([SupplierEntity, SupplierVariantEntity]), CatalogModule],
  controllers: [SuppliersController, SupplierVariantsController],
  providers: [...suppliersModuleProviders],
  exports: [SUPPLIER_REPOSITORY, SUPPLIER_VARIANT_REPOSITORY],
})
export class SuppliersModule {}
