import { BadRequestException, Inject } from '@nestjs/common';
import { ProductEquivalence } from 'src/modules/catalog/domain/entity/product-equivalence';
import { CreateProductEquivalenceInput } from '../../dto/product-equivalences/input/create-product-equivalence';
import { PRODUCT_EQUIVALENCE_REPOSITORY, ProductEquivalenceRepository } from '../../ports/product-equivalence.repository';

export class CreateProductEquivalence {
  constructor(
    @Inject(PRODUCT_EQUIVALENCE_REPOSITORY)
    private readonly equivalenceRepo: ProductEquivalenceRepository,
  ) {}

  async execute(input: CreateProductEquivalenceInput): Promise<{type:string, message:string}> {
    const equivalence = new ProductEquivalence(
      undefined,
      input.productId,
      input.fromUnitId,
      input.toUnitId,
      input.factor,
    );

    try {
      await this.equivalenceRepo.create(equivalence);
    } catch {
      throw new BadRequestException('Error al crear equivalencia');
    }

    return {
      type: 'success',
      message: 'Equivalencia creada con éxito'
    };
  }
}
