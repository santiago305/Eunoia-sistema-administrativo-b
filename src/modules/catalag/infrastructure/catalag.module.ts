import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductEntity } from '../adapters/out/persistence/typeorm/entities/product.entity';
import { ProductVariantEntity } from '../adapters/out/persistence/typeorm/entities/product-variant.entity';

import { ProductTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/product.typeorm.repo';
import { ProductVariantTypeormRepository } from '../adapters/out/persistence/typeorm/repositories/product-variant.typeorm.repo';

import { PRODUCT_REPOSITORY } from '../domain/ports/product.repository';
import { PRODUCT_VARIANT } from '../domain/ports/product-variant.repository';

import { CreateProduct } from '../application/usecases/product/created.usecase';
import { UpdateProduct } from '../application/usecases/product/update.usecase';
import { SetProductActive } from '../application/usecases/product/set-active.usecase';
import { ListActiveProducts } from '../application/usecases/product/list-active.usecase';
import { ListInactiveProducts } from '../application/usecases/product/list-inactive.usecase';

import { CreateProductVariant } from '../application/usecases/product-variant/create.usecase';
import { UpdateProductVariant } from '../application/usecases/product-variant/update.usecase';
import { SetProductVariantActive } from '../application/usecases/product-variant/set-active.usecase';
import { GetProductVariant } from '../application/usecases/product-variant/get-element-by-id.usercase';
import { ListActiveProductVariants } from '../application/usecases/product-variant/list-active.usecase';
import { ListInactiveProductVariants } from '../application/usecases/product-variant/list-inactive.usecase';
import { SearchProductVariants } from '../application/usecases/product-variant/search.usecase';

import { UNIT_OF_WORK } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { TypeormUnitOfWork } from 'src/modules/inventory/adapters/out/typeorm/uow/typeorm.unit-of-work';
import { CLOCK } from 'src/modules/inventory/domain/ports/clock.port';

import { ProductsController } from '../adapters/in/controllers/product.controller';
import { ProductVariantsController } from '../adapters/in/controllers/product-variant.controller';
import { SearchProducts } from '../application/usecases/product/search.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, ProductVariantEntity]),
  ],
  controllers: [ProductsController, ProductVariantsController],
  providers: [
    // use cases
    CreateProduct,
    UpdateProduct,
    SetProductActive,
    ListActiveProducts,
    ListInactiveProducts,

    CreateProductVariant,
    UpdateProductVariant,
    SetProductVariantActive,
    GetProductVariant,
    ListActiveProductVariants,
    ListInactiveProductVariants,
    SearchProductVariants,
    SearchProducts,

    // repos
    { provide: PRODUCT_REPOSITORY, useClass: ProductTypeormRepository },
    { provide: PRODUCT_VARIANT, useClass: ProductVariantTypeormRepository },

    // shared infra
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
    { provide: CLOCK, useValue: { now: () => new Date() } },
  ],
  exports: [PRODUCT_REPOSITORY, PRODUCT_VARIANT],
})
export class CatalagModule {}
