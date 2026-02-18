import { Inject } from '@nestjs/common';
import { PRODUCT_EQUIVALENCE_REPOSITORY, ProductEquivalenceRepository } from 'src/modules/catalog/domain/ports/product-equivalence.repository';
import { VariantId } from 'src/modules/inventory/domain/value-objects/ids';
import { ListProductEquivalenceInput } from '../../dto/product-equivalences/input/list-product-equivalence';
import { ProductEquivalenceOutput } from '../../dto/product-equivalences/output/product-equivalence-out';
import { ProductEquivalence } from 'src/modules/catalog/domain/entity/product-equivalence';

export class ListProductEquivalencesByVariant {
  constructor(
    @Inject(PRODUCT_EQUIVALENCE_REPOSITORY)
    private readonly equivalenceRepo: ProductEquivalenceRepository,
  ) {}

  async execute(input: ListProductEquivalenceInput): Promise<ProductEquivalenceOutput[]> {
    const rows = await this.equivalenceRepo.listByVariantId(new VariantId(input.variantId));
    return rows.map((e: ProductEquivalence) => ({
      id: e.equivalence_id,
      primaVariantId: e.prima_variant_id,
      fromUnitId: e.from_unit_id,
      toUnitId: e.to_unit_id,
      factor: e.factor,
    }));
  }
}
