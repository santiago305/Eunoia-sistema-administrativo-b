import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductEntity } from '../adapters/out/persistence/typeorm/entities/product.entity';
import { ProductVariantEntity } from '../adapters/out/persistence/typeorm/entities/product-variant.entity';
import { UnitEntity } from '../adapters/out/persistence/typeorm/entities/unit.entity';
import { ProductEquivalenceEntity } from '../adapters/out/persistence/typeorm/entities/product-equivalence.entity';
import { ProductRecipeEntity } from '../adapters/out/persistence/typeorm/entities/product-recipe.entity';
import { SkuCounterEntity } from '../adapters/out/persistence/typeorm/entities/sku-counter.entity';

import { ProductTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/product.typeorm.repo';
import { ProductVariantTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/product-variant.typeorm.repo';
import { UnitTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/unit.typeorm.repo';
import { ProductEquivalenceTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/product-equivalence.typeorm.repo';
import { ProductRecipeTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/product-recipe.typeorm.repo';
import { SkuCounterTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/sku-counter.typeorm.repo';

import { PRODUCT_REPOSITORY } from '../domain/ports/product.repository';
import { PRODUCT_VARIANT_REPOSITORY } from '../domain/ports/product-variant.repository';
import { UNIT_REPOSITORY } from '../domain/ports/unit.repository';
import { PRODUCT_EQUIVALENCE_REPOSITORY } from '../domain/ports/product-equivalence.repository';
import { PRODUCT_RECIPE_REPOSITORY } from '../domain/ports/product-recipe.repository';
import { SKU_COUNTER_REPOSITORY } from '../domain/ports/sku-counter.repository';

import { CreateProduct } from '../application/usecases/product/created.usecase';
import { UpdateProduct } from '../application/usecases/product/update.usecase';
import { SetProductActive } from '../application/usecases/product/set-active.usecase';
import { GetProductWithVariants } from '../application/usecases/product/get-with-variants.usecase';
import { GetProductById } from '../application/usecases/product/get-by-id.usecase';
import { GetProductByName } from '../application/usecases/product/get-by-name.usecase';

import { CreateProductVariant } from '../application/usecases/product-variant/create.usecase';
import { UpdateProductVariant } from '../application/usecases/product-variant/update.usecase';
import { SetProductVariantActive } from '../application/usecases/product-variant/set-active.usecase';
import { GetProductVariant } from '../application/usecases/product-variant/get-element-by-id.usercase';
import { ListRowMaterialProductVariants } from '../application/usecases/product-variant/list-row-material.usecase';
import { SearchProductVariants } from '../application/usecases/product-variant/search.usecase';
import { ListProductVariants } from '../application/usecases/product-variant/list-by-product.usecase';
import { ListUnits } from '../application/usecases/unit/list.usecase';
import { CreateProductEquivalence } from '../application/usecases/product-equivalence/create.usecase';
import { DeleteProductEquivalence } from '../application/usecases/product-equivalence/delete.usecase';
import { ListProductEquivalencesByVariant } from '../application/usecases/product-equivalence/list-by-variant.usecase';
import { CreateProductRecipe } from '../application/usecases/product-recipe/create.usecase';
import { DeleteProductRecipe } from '../application/usecases/product-recipe/delete.usecase';
import { ListProductRecipesByVariant } from '../application/usecases/product-recipe/list-by-variant.usecase';

import { UNIT_OF_WORK } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormUnitOfWork } from 'src/shared/infrastructure/typeorm/typeorm.unit-of-work';
import { CLOCK } from 'src/modules/inventory/domain/ports/clock.port';

import { ProductsController } from '../adapters/in/controllers/product.controller';
import { ProductVariantsController } from '../adapters/in/controllers/product-variant.controller';
import { UnitsController } from '../adapters/in/controllers/unit.controller';
import { ProductEquivalencesController } from '../adapters/in/controllers/product-equivalence.controller';
import { ProductRecipesController } from '../adapters/in/controllers/product-recipe.controller';
import { SearchProductsPaginated } from '../application/usecases/product/search-paginated.usecase';
import { CatalogSummaryController } from '../adapters/in/controllers/catalog-summary.controller';
import { GetCatalogSummary } from '../application/usecases/catalog/get-summary.usecase';
import { InventoryModule } from 'src/modules/inventory/infrastructure/inventory.module';

@Module({
  imports: [
    InventoryModule,
    TypeOrmModule.forFeature([
      ProductEntity,
      ProductVariantEntity,
      UnitEntity,
      ProductEquivalenceEntity,
      ProductRecipeEntity,
      SkuCounterEntity,
    ]),
  ],
  controllers: [ProductsController, ProductVariantsController, UnitsController, ProductEquivalencesController, ProductRecipesController
    ,CatalogSummaryController
  ],
  providers: [
    // use cases
    CreateProduct,
    UpdateProduct,
    SetProductActive,
    GetProductWithVariants,
    GetProductById,
    GetProductByName,

    CreateProductVariant,
    UpdateProductVariant,
    SetProductVariantActive,
    GetProductVariant,
    ListRowMaterialProductVariants,
    SearchProductVariants,
    ListProductVariants,
    SearchProductsPaginated,
    ListUnits,
    CreateProductEquivalence,
    DeleteProductEquivalence,
    ListProductEquivalencesByVariant,
    CreateProductRecipe,
    DeleteProductRecipe,
    ListProductRecipesByVariant,
    GetCatalogSummary,

    // repos
    { provide: PRODUCT_REPOSITORY, useClass: ProductTypeormRepository },
    { provide: PRODUCT_VARIANT_REPOSITORY, useClass: ProductVariantTypeormRepository },
    { provide: UNIT_REPOSITORY, useClass: UnitTypeormRepository },
    { provide: PRODUCT_EQUIVALENCE_REPOSITORY, useClass: ProductEquivalenceTypeormRepository },
    { provide: PRODUCT_RECIPE_REPOSITORY, useClass: ProductRecipeTypeormRepository },
    { provide: SKU_COUNTER_REPOSITORY, useClass: SkuCounterTypeormRepository },

    // shared infra
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
    { provide: CLOCK, useValue: { now: () => new Date() } },
  ],
  exports: [
    PRODUCT_REPOSITORY,
    PRODUCT_VARIANT_REPOSITORY,
    UNIT_REPOSITORY,
    PRODUCT_EQUIVALENCE_REPOSITORY,
    PRODUCT_RECIPE_REPOSITORY,
    SKU_COUNTER_REPOSITORY,
  ],
})
export class CatalogModule {}
