import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogEquivalence } from "../../domain/entities/equivalence";
import {
  PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY,
  ProductCatalogEquivalenceRepository,
} from "../../domain/ports/equivalence.repository";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "../../domain/ports/product.repository";
import { PRODUCT_CATALOG_UNIT_REPOSITORY, ProductCatalogUnitRepository } from "../../domain/ports/unit.repository";

@Injectable()
export class CreateProductCatalogEquivalence {
  constructor(
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productRepo: ProductCatalogProductRepository,
    @Inject(PRODUCT_CATALOG_UNIT_REPOSITORY)
    private readonly unitRepo: ProductCatalogUnitRepository,
    @Inject(PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY)
    private readonly equivalenceRepo: ProductCatalogEquivalenceRepository,
  ) {}

  async execute(input: { productId: string; fromUnitId: string; toUnitId: string; factor: number }) {
    const product = await this.productRepo.findById(input.productId);
    if (!product) throw new NotFoundException("Product not found");
    const fromUnit = await this.unitRepo.findById(input.fromUnitId);
    if (!fromUnit) throw new NotFoundException("From unit not found");
    const toUnit = await this.unitRepo.findById(input.toUnitId);
    if (!toUnit) throw new NotFoundException("To unit not found");

    return this.equivalenceRepo.create(
      new ProductCatalogEquivalence(undefined, input.productId, input.fromUnitId, input.toUnitId, input.factor),
    );
  }
}
