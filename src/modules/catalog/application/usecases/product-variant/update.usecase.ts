import { ConflictException, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Money } from 'src/shared/value-objets/money.vo';
import { UpdateProductVariantInput } from '../../dto/product-variants/input/update-product-variant';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from '../../ports/product-variant.repository';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../ports/product.repository';
import { CatalogOutputMapper } from '../../mappers/catalog-output.mapper';
import { ProductVariantNotFoundApplicationError } from '../../errors/product-variant-not-found.error';

export class UpdateProductVariant {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: UpdateProductVariantInput) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.variantRepo.findById(input.id, tx);
      if (!current) {
        throw new NotFoundException(new ProductVariantNotFoundApplicationError().message);
      }

      if (input.barcode?.trim() && input.barcode.trim() !== (current.getBarcode() ?? '')) {
        const existsBarcode = await this.variantRepo.findByBarcode(input.barcode.trim(), tx);
        if (existsBarcode && existsBarcode.getId() !== current.getId()) {
          throw new ConflictException('Barcode ya existe');
        }
      }

      const customSku = input.customSku !== undefined ? (input.customSku?.trim() || null) : undefined;
      const updated = await this.variantRepo.update(
        {
          id: input.id,
          barcode: input.barcode === null ? null : input.barcode?.trim() ?? undefined,
          customSku,
          attributes: input.attributes,
          price: input.price !== undefined ? Money.create(input.price) : undefined,
          cost: input.cost !== undefined ? Money.create(input.cost) : undefined,
          minStock: input.minStock === undefined ? undefined : input.minStock,
        },
        tx,
      );

      if (!updated) {
        throw new InternalServerErrorException('Variante no actualizada, por favor intente de nuevo');
      }

      return CatalogOutputMapper.toProductVariantOutput(updated);
    });
  }
}
