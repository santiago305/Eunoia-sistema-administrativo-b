import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../adapters/out/persistence/typeorm/entities/product.entity';
import { ProductVariantEntity } from '../adapters/out/persistence/typeorm/entities/product-variant.entity';
import { UnitEntity } from '../adapters/out/persistence/typeorm/entities/unit.entity';
import { ProductEquivalenceEntity } from '../adapters/out/persistence/typeorm/entities/product-equivalence.entity';
import { ProductRecipeEntity } from '../adapters/out/persistence/typeorm/entities/product-recipe.entity';
import { SkuCounterEntity } from '../adapters/out/persistence/typeorm/entities/sku-counter.entity';
import { ProductsController } from '../adapters/in/controllers/product.controller';
import { ProductVariantsController } from '../adapters/in/controllers/product-variant.controller';
import { UnitsController } from '../adapters/in/controllers/unit.controller';
import { ProductEquivalencesController } from '../adapters/in/controllers/product-equivalence.controller';
import { ProductRecipesController } from '../adapters/in/controllers/product-recipe.controller';
import { CatalogSummaryController } from '../adapters/in/controllers/catalog-summary.controller';
import { InventoryModule } from 'src/modules/inventory/infrastructure/inventory.module';
import { PRODUCT_EQUIVALENCE_REPOSITORY } from '../application/ports/product-equivalence.repository';
import { PRODUCT_RECIPE_REPOSITORY } from '../application/ports/product-recipe.repository';
import { PRODUCT_VARIANT_REPOSITORY } from '../application/ports/product-variant.repository';
import { PRODUCT_REPOSITORY } from '../application/ports/product.repository';
import { SKU_COUNTER_REPOSITORY } from '../application/ports/sku-counter.repository';
import { UNIT_REPOSITORY } from '../application/ports/unit.repository';
import { catalogModuleProviders } from '../composition/container';

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
  controllers: [
    ProductsController,
    ProductVariantsController,
    UnitsController,
    ProductEquivalencesController,
    ProductRecipesController,
    CatalogSummaryController,
  ],
  providers: [...catalogModuleProviders],
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
