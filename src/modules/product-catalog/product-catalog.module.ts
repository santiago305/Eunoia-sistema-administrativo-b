import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductCatalogProductController } from "./adapters/in/http/controllers/product.controller";
import { ProductCatalogPublicationController } from "./adapters/in/http/controllers/publication.controller";
import { ProductCatalogRecipeController } from "./adapters/in/http/controllers/recipe.controller";
import { ProductCatalogSkuController } from "./adapters/in/http/controllers/sku.controller";
import { ProductCatalogStockController } from "./adapters/in/http/controllers/stock.controller";
import { ProductCatalogUnitController } from "./adapters/in/http/controllers/unit.controller";
import { ProductCatalogEquivalenceController } from "./adapters/in/http/controllers/equivalence.controller";
import { ProductCatalogAttributeEntity } from "./adapters/out/persistence/typeorm/entities/attribute.entity";
import { ProductCatalogPublicationEntity } from "./adapters/out/persistence/typeorm/entities/catalog-publication.entity";
import { ProductCatalogInventoryEntity } from "./adapters/out/persistence/typeorm/entities/inventory.entity";
import { ProductCatalogInventoryDocumentItemEntity } from "./adapters/out/persistence/typeorm/entities/inventory-document-item.entity";
import { ProductCatalogInventoryDocumentEntity } from "./adapters/out/persistence/typeorm/entities/inventory-document.entity";
import { ProductCatalogInventoryLedgerEntity } from "./adapters/out/persistence/typeorm/entities/inventory-ledger.entity";
import { ProductCatalogProductEntity } from "./adapters/out/persistence/typeorm/entities/product.entity";
import { ProductCatalogRecipeItemEntity } from "./adapters/out/persistence/typeorm/entities/recipe-item.entity";
import { ProductCatalogRecipeEntity } from "./adapters/out/persistence/typeorm/entities/recipe.entity";
import { ProductCatalogSkuAttributeValueEntity } from "./adapters/out/persistence/typeorm/entities/sku-attribute-value.entity";
import { ProductCatalogSkuEntity } from "./adapters/out/persistence/typeorm/entities/sku.entity";
import { ProductCatalogStockItemEntity } from "./adapters/out/persistence/typeorm/entities/stock-item.entity";
import { ProductCatalogUnitEntity } from "./adapters/out/persistence/typeorm/entities/unit.entity";
import { ProductCatalogEquivalencesEntity } from "./adapters/out/persistence/typeorm/entities/equivalences.entity";
import { ProductCatalogDocumentSerieEntity } from "./adapters/out/persistence/typeorm/entities/document-serie.entity";
import { RegisterProductCatalogInventoryMovement } from "./application/usecases/register-inventory-movement.usecase";
import { ReserveProductCatalogMaterials } from "./application/usecases/reserve-materials.usecase";
import { productCatalogModuleProviders } from "./composition/container";
import { PRODUCT_CATALOG_INVENTORY_REPOSITORY } from "./domain/ports/inventory.repository";
import { PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY } from "./domain/ports/inventory-document.repository";
import { PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY } from "./domain/ports/inventory-ledger.repository";
import { PRODUCT_CATALOG_PRODUCT_REPOSITORY } from "./domain/ports/product.repository";
import { PRODUCT_CATALOG_PUBLICATION_REPOSITORY } from "./domain/ports/publication.repository";
import { PRODUCT_CATALOG_RECIPE_REPOSITORY } from "./domain/ports/recipe.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY } from "./domain/ports/sku.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY } from "./domain/ports/stock-item.repository";
import { PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY } from "./domain/ports/document-serie.repository";
import { PRODUCT_CATALOG_UNIT_REPOSITORY } from "./domain/ports/unit.repository";
import { PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY } from "./domain/ports/equivalence.repository";
import { CreateProductCatalogDocumentSerieUseCase } from "./application/usecases/create-document-serie.usecase";
import { GetActiveProductCatalogDocumentSerieUseCase } from "./application/usecases/get-active-document-series.usecase";
import { SERIES_REPOSITORY } from "./integration/inventory/ports/document-series.repository.port";
import { DOCUMENT_REPOSITORY } from "./integration/inventory/ports/document.repository.port";
import { LEDGER_REPOSITORY } from "./integration/inventory/ports/ledger.repository.port";
import { INVENTORY_REPOSITORY } from "./integration/inventory/ports/inventory.repository.port";
import { INVENTORY_LOCK } from "./integration/inventory/ports/inventory-lock.port";
import { STOCK_ITEM_REPOSITORY } from "./integration/inventory/ports/stock-item.repository.port";
import { ProductCatalogDocumentSerieController } from "./adapters/in/http/controllers/document-serie.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductCatalogProductEntity,
      ProductCatalogSkuEntity,
      ProductCatalogAttributeEntity,
      ProductCatalogSkuAttributeValueEntity,
      ProductCatalogRecipeEntity,
      ProductCatalogRecipeItemEntity,
      ProductCatalogPublicationEntity,
      ProductCatalogStockItemEntity,
      ProductCatalogInventoryEntity,
      ProductCatalogInventoryDocumentEntity,
      ProductCatalogInventoryDocumentItemEntity,
      ProductCatalogInventoryLedgerEntity,
      ProductCatalogDocumentSerieEntity,
      ProductCatalogUnitEntity,
      ProductCatalogEquivalencesEntity,
    ]),
  ],
  controllers: [
    ProductCatalogProductController,
    ProductCatalogSkuController,
    ProductCatalogRecipeController,
    ProductCatalogPublicationController,
    ProductCatalogStockController,
    ProductCatalogUnitController,
    ProductCatalogEquivalenceController,
    ProductCatalogDocumentSerieController
  ],
  providers: [
    ...productCatalogModuleProviders,
    CreateProductCatalogDocumentSerieUseCase,
    GetActiveProductCatalogDocumentSerieUseCase,
  ],
  exports: [
    PRODUCT_CATALOG_PRODUCT_REPOSITORY,
    PRODUCT_CATALOG_SKU_REPOSITORY,
    PRODUCT_CATALOG_RECIPE_REPOSITORY,
    PRODUCT_CATALOG_PUBLICATION_REPOSITORY,
    PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
    PRODUCT_CATALOG_INVENTORY_REPOSITORY,
    PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY,
    PRODUCT_CATALOG_INVENTORY_LEDGER_REPOSITORY,
    PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY,
    PRODUCT_CATALOG_UNIT_REPOSITORY,
    PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY,
    SERIES_REPOSITORY,
    DOCUMENT_REPOSITORY,
    LEDGER_REPOSITORY,
    INVENTORY_REPOSITORY,
    INVENTORY_LOCK,
    STOCK_ITEM_REPOSITORY,
    RegisterProductCatalogInventoryMovement,
    ReserveProductCatalogMaterials,
    CreateProductCatalogDocumentSerieUseCase,
    GetActiveProductCatalogDocumentSerieUseCase,
  ],
})
export class ProductCatalogModule {}
