import { BadRequestException, Inject } from '@nestjs/common';
import { PRODUCT_EQUIVALENCE_REPOSITORY, ProductEquivalenceRepository } from 'src/modules/catalog/domain/ports/product-equivalence.repository';

export class DeleteProductEquivalence {
  constructor(
    @Inject(PRODUCT_EQUIVALENCE_REPOSITORY)
    private readonly equivalenceRepo: ProductEquivalenceRepository,
  ) {}

  async execute(id: string): Promise<{type: string, message: string}> {
    const row = await this.equivalenceRepo.findById(id);
    if(!row){
      throw new BadRequestException({
        type:'error',
        message:'¡Error, no existe la equivalencia!'
      });
    }
    try {
      await this.equivalenceRepo.deleteById(id);
    } catch {
      throw new BadRequestException({
        type:'error',
        message:'¡Error al borrar equivalencia!'
      });
    }
    return {
      type:'success',
      message:'!Equivalencia borrada con exito!'
    }
  }
}
