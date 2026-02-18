import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductEntity } from '../adapters/out/persistence/typeorm/entities/product.entity';
import { ProductVariantEntity } from '../adapters/out/persistence/typeorm/entities/product-variant.entity';
import { UnitEntity } from '../adapters/out/persistence/typeorm/entities/unit.entity';
import { ProductEquivalenceEntity } from '../adapters/out/persistence/typeorm/entities/product-equivalence.entity';

import { ProductTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/product.typeorm.repo';
import { ProductVariantTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/product-variant.typeorm.repo';
import { UnitTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/unit.typeorm.repo';
import { ProductEquivalenceTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/product-equivalence.typeorm.repo';

import { PRODUCT_REPOSITORY } from '../domain/ports/product.repository';
import { PRODUCT_VARIANT_REPOSITORY } from '../domain/ports/product-variant.repository';
import { UNIT_REPOSITORY } from '../domain/ports/unit.repository';
import { PRODUCT_EQUIVALENCE_REPOSITORY } from '../domain/ports/product-equivalence.repository';

import { CreateProduct } from '../application/usecases/product/created.usecase';
import { UpdateProduct } from '../application/usecases/product/update.usecase';
import { SetProductActive } from '../application/usecases/product/set-active.usecase';
import { ListActiveProducts } from '../application/usecases/product/list-active.usecase';
import { ListInactiveProducts } from '../application/usecases/product/list-inactive.usecase';
import { GetProductWithVariants } from '../application/usecases/product/get-with-variants.usecase';

import { CreateProductVariant } from '../application/usecases/product-variant/create.usecase';
import { UpdateProductVariant } from '../application/usecases/product-variant/update.usecase';
import { SetProductVariantActive } from '../application/usecases/product-variant/set-active.usecase';
import { GetProductVariant } from '../application/usecases/product-variant/get-element-by-id.usercase';
import { ListActiveProductVariants } from '../application/usecases/product-variant/list-active.usecase';
import { ListInactiveProductVariants } from '../application/usecases/product-variant/list-inactive.usecase';
import { SearchProductVariants } from '../application/usecases/product-variant/search.usecase';
import { ListProductVariants } from '../application/usecases/product-variant/list-by-product.usecase';
import { ListUnits } from '../application/usecases/unit/list.usecase';
import { CreateProductEquivalence } from '../application/usecases/product-equivalence/create.usecase';
import { DeleteProductEquivalence } from '../application/usecases/product-equivalence/delete.usecase';
import { ListProductEquivalencesByVariant } from '../application/usecases/product-equivalence/list-by-variant.usecase';

import { UNIT_OF_WORK } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { TypeormUnitOfWork } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.unit-of-work';
import { CLOCK } from 'src/modules/inventory/domain/ports/clock.port';

import { ProductsController } from '../adapters/in/controllers/product.controller';
import { ProductVariantsController } from '../adapters/in/controllers/product-variant.controller';
import { UnitsController } from '../adapters/in/controllers/unit.controller';
import { ProductEquivalencesController } from '../adapters/in/controllers/product-equivalence.controller';
import { SearchProductsPaginated } from '../application/usecases/product/search-paginated.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, ProductVariantEntity, UnitEntity, ProductEquivalenceEntity]),
  ],
  controllers: [ProductsController, ProductVariantsController, UnitsController, ProductEquivalencesController],
  providers: [
    // use cases
    CreateProduct,
    UpdateProduct,
    SetProductActive,
    ListActiveProducts,
    ListInactiveProducts,
    GetProductWithVariants,

    CreateProductVariant,
    UpdateProductVariant,
    SetProductVariantActive,
    GetProductVariant,
    ListActiveProductVariants,
    ListInactiveProductVariants,
    SearchProductVariants,
    ListProductVariants,
    SearchProductsPaginated,
    ListUnits,
    CreateProductEquivalence,
    DeleteProductEquivalence,
    ListProductEquivalencesByVariant,

    // repos
    { provide: PRODUCT_REPOSITORY, useClass: ProductTypeormRepository },
    { provide: PRODUCT_VARIANT_REPOSITORY, useClass: ProductVariantTypeormRepository },
    { provide: UNIT_REPOSITORY, useClass: UnitTypeormRepository },
    { provide: PRODUCT_EQUIVALENCE_REPOSITORY, useClass: ProductEquivalenceTypeormRepository },

    // shared infra
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
    { provide: CLOCK, useValue: { now: () => new Date() } },
  ],
  exports: [PRODUCT_REPOSITORY, PRODUCT_VARIANT_REPOSITORY, UNIT_REPOSITORY, PRODUCT_EQUIVALENCE_REPOSITORY],
})
export class CatalogModule {}

