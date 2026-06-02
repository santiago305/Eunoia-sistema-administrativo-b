import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule } from "src/modules/clients/clients.module";
import { UbigeoModule } from "src/modules/ubigeo/ubigeo.module";
import { ImportsController } from "../adapters/in/excel.controller";
import { PreviewOrdersImportUseCase } from "../application/preview-orders-import.use-case";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { CLOCK } from "src/shared/application/ports/clock.port";

import { ProductCatalogProductEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/product.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogAttributeEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/attribute.entity";
import { ProductCatalogSkuAttributeValueEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku-attribute-value.entity";

import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
} from "src/modules/product-catalog/domain/ports/product.repository";
import {
  PRODUCT_CATALOG_SKU_REPOSITORY,
} from "src/modules/product-catalog/domain/ports/sku.repository";

import { ProductCatalogProductTypeormRepository } from "src/modules/product-catalog/adapters/out/persistence/typeorm/repositories/product.typeorm.repo";
import { ProductCatalogSkuTypeormRepository } from "src/modules/product-catalog/adapters/out/persistence/typeorm/repositories/sku.typeorm.repo";

import { CreateProductCatalogProduct } from "src/modules/product-catalog/application/usecases/create-product.usecase";
import { CreateProductCatalogSku } from "src/modules/product-catalog/application/usecases/create-sku.usecase";
import { ProductCatalogStockItemTypeormRepository } from "src/modules/product-catalog/adapters/out/persistence/typeorm/repositories/stock-item.typeorm.repo";
import { ProductCatalogStockItemEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/stock-item.entity";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { CreateSourceUsecase } from "src/modules/sources/application/usecases/source/create.usecase";
import { CreateProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/create-stock-item.usecase";
import { ProductCatalogInventoryEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/inventory.entity";
import { ProductCatalogInventoryTypeormRepository } from "src/modules/product-catalog/adapters/out/persistence/typeorm/repositories/inventory.typeorm.repo";
import { PRODUCT_CATALOG_INVENTORY_REPOSITORY } from "src/modules/product-catalog/domain/ports/inventory.repository";
import { SourceEntity } from "src/modules/sources/adapters/out/persistence/typeorm/entities/source.entity";
import { SourceTypeormRepository } from "src/modules/sources/adapters/out/persistence/typeorm/repositories/source.typeorm.repo";
import { SOURCE_REPOSITORY } from "src/modules/sources/domain/ports/source.repository";
import { SaleOrderTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo";
import { SALE_ORDER_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SaleOrderItemTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-item.typeorm.repo";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SaleOrderItemComponentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-item-component.entity";
import { SaleOrderItemEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-item.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { SaleOrderItemComponentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order-item-component.typeorm.repo";
import { SalePaymentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-payment.typeorm.repo";
import { SALE_PAYMENT_REPOSITORY } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SaleOrderImportClientResolverService } from "src/modules/sale-orders/application/services/sale-order-import-client-resolver.service";
import { SaleOrderImportSourceResolverService } from "src/modules/sale-orders/application/services/sale-order-import-source-resolver.service";
import { SaleOrderImportSkuResolverService } from "src/modules/sale-orders/application/services/sale-order-import-sku-resolver.service";

@Module({
  imports: [
    ClientsModule,
    UbigeoModule,
    TypeOrmModule.forFeature([
      ProductCatalogProductEntity,
      ProductCatalogSkuEntity,
      ProductCatalogAttributeEntity,
      ProductCatalogSkuAttributeValueEntity,
      ProductCatalogStockItemEntity,
      ProductCatalogInventoryEntity,
      SourceEntity,
      SaleOrderEntity,
      SaleOrderItemEntity,
      SaleOrderItemComponentEntity,
      SalePaymentEntity,
    ]),
  ],
  controllers: [ImportsController],
  providers: [
    PreviewOrdersImportUseCase,
    SaleOrderImportClientResolverService,
    SaleOrderImportSourceResolverService,
    SaleOrderImportSkuResolverService,
    CreateProductCatalogProduct,
    CreateProductCatalogSku,
    CreateProductCatalogStockItem,
    CreateSourceUsecase,
    {
      provide: SALE_ORDER_REPOSITORY,
      useClass: SaleOrderTypeormRepository,
    },
    {
      provide: SALE_ORDER_ITEM_REPOSITORY,
      useClass: SaleOrderItemTypeormRepository,
    },
    {
      provide: SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
      useClass: SaleOrderItemComponentTypeormRepository,
    },
    {
      provide: SALE_PAYMENT_REPOSITORY,
      useClass: SalePaymentTypeormRepository,
    },
    {
      provide: PRODUCT_CATALOG_PRODUCT_REPOSITORY,
      useClass: ProductCatalogProductTypeormRepository,
    },
    {
      provide: PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
      useClass: ProductCatalogStockItemTypeormRepository,
    },
    {
      provide: PRODUCT_CATALOG_SKU_REPOSITORY,
      useClass: ProductCatalogSkuTypeormRepository,
    },
    {
      provide: PRODUCT_CATALOG_INVENTORY_REPOSITORY,
      useClass: ProductCatalogInventoryTypeormRepository,
    },
    {
      provide: UNIT_OF_WORK,
      useClass: TypeormUnitOfWork,
    },
    {
      provide: CLOCK,
      useValue: { now: () => new Date() },
    },
    {
      provide: SOURCE_REPOSITORY,
      useClass: SourceTypeormRepository,
    },
  ],
})
export class ImportsModule {}
