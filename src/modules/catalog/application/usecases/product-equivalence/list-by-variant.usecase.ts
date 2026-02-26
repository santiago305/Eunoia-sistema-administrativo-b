import { Inject } from '@nestjs/common';
import { PRODUCT_EQUIVALENCE_REPOSITORY, ProductEquivalenceRepository } from 'src/modules/catalog/domain/ports/product-equivalence.repository';
import { ListProductEquivalenceInput } from '../../dto/product-equivalences/input/list-product-equivalence';
import { ProductEquivalenceOutput } from '../../dto/product-equivalences/output/product-equivalence-out';
import { ProductEquivalence } from 'src/modules/catalog/domain/entity/product-equivalence';

export class ListProductEquivalencesByVariant {
  constructor(
    @Inject(PRODUCT_EQUIVALENCE_REPOSITORY)
    private readonly equivalenceRepo: ProductEquivalenceRepository,
  ) {}

  async execute(input: ListProductEquivalenceInput): Promise<ProductEquivalenceOutput[]> {
    const rows = await this.equivalenceRepo.listByProductId(input.productId);
    return rows.map((e: ProductEquivalence) => ({
      id: e.equivalenceId,
      productId: e.productId,
      fromUnitId: e.fromUnitId,
      toUnitId: e.toUnitId,
      factor: e.factor,
    }));
  }
}
