import { Provider } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { CLOCK } from "src/modules/inventory/application/ports/clock.port";
import { ProductTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/product.typeorm.repo";
import { ProductVariantTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/product-variant.typeorm.repo";
import { UnitTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/unit.typeorm.repo";
import { ProductEquivalenceTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/product-equivalence.typeorm.repo";
import { ProductRecipeTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/product-recipe.typeorm.repo";
import { SkuCounterTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/sku-counter.typeorm.repo";
import { PRODUCT_EQUIVALENCE_REPOSITORY } from "../application/ports/product-equivalence.repository";
import { PRODUCT_RECIPE_REPOSITORY } from "../application/ports/product-recipe.repository";
import { PRODUCT_VARIANT_REPOSITORY } from "../application/ports/product-variant.repository";
import { PRODUCT_REPOSITORY } from "../application/ports/product.repository";
import { SKU_COUNTER_REPOSITORY } from "../application/ports/sku-counter.repository";
import { UNIT_REPOSITORY } from "../application/ports/unit.repository";
import { catalogUsecasesProviders } from "../application/providers/catalog-usecases.providers";

export const catalogModuleProviders: Provider[] = [
  ...catalogUsecasesProviders,
  { provide: PRODUCT_REPOSITORY, useClass: ProductTypeormRepository },
  { provide: PRODUCT_VARIANT_REPOSITORY, useClass: ProductVariantTypeormRepository },
  { provide: UNIT_REPOSITORY, useClass: UnitTypeormRepository },
  { provide: PRODUCT_EQUIVALENCE_REPOSITORY, useClass: ProductEquivalenceTypeormRepository },
  { provide: PRODUCT_RECIPE_REPOSITORY, useClass: ProductRecipeTypeormRepository },
  { provide: SKU_COUNTER_REPOSITORY, useClass: SkuCounterTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];
