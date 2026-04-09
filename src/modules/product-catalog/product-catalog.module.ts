import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductCatalogProductController } from "./adapters/in/http/controllers/product.controller";
import { ProductCatalogPublicationController } from "./adapters/in/http/controllers/publication.controller";
import { ProductCatalogRecipeController } from "./adapters/in/http/controllers/recipe.controller";
import { ProductCatalogSkuController } from "./adapters/in/http/controllers/sku.controller";
import { ProductCatalogStockController } from "./adapters/in/http/controllers/stock.controller";
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
import { CreateProductCatalogDocumentSerieUseCase } from "./application/usecases/create-document-serie.usecase";
import { GetActiveProductCatalogDocumentSerieUseCase } from "./application/usecases/get-active-document-series.usecase";

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
    ]),
  ],
  controllers: [
    ProductCatalogProductController,
    ProductCatalogSkuController,
    ProductCatalogRecipeController,
    ProductCatalogPublicationController,
    ProductCatalogStockController,
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
    RegisterProductCatalogInventoryMovement,
    ReserveProductCatalogMaterials,
    CreateProductCatalogDocumentSerieUseCase,
    GetActiveProductCatalogDocumentSerieUseCase,
  ],
})
export class ProductCatalogModule {}
