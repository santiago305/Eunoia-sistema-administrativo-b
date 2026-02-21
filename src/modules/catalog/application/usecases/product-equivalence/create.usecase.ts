import { BadRequestException, Inject } from '@nestjs/common';
import { PRODUCT_EQUIVALENCE_REPOSITORY, ProductEquivalenceRepository } from 'src/modules/catalog/domain/ports/product-equivalence.repository';
import { ProductEquivalence } from 'src/modules/catalog/domain/entity/product-equivalence';
import { CreateProductEquivalenceInput } from '../../dto/product-equivalences/input/create-product-equivalence';

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
      throw new BadRequestException( {
        type: 'error',
        message: '¡Error al crear equivalence'
      })
    }

    return {
      type: 'success',
      message: '¡Equivalencia creada con exito!'
    }

  }
}
