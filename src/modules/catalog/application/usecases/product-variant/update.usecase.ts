import { Inject, BadRequestException } from '@nestjs/common';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from 'src/modules/catalog/domain/ports/product-variant.repository';
import { PRODUCT_REPOSITORY, ProductRepository } from 'src/modules/catalog/domain/ports/product.repository';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { UpdateProductVariantInput } from '../../dto/product-variants/input/update-product-variant';
import { ProductVariantOutput } from '../../dto/product-variants/output/product-variant-out';
import { UNIT_OF_WORK, UnitOfWork } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { buildSkuPreservingSeries } from 'src/shared/utilidades/utils/updateSku';

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
      let sku = input.sku;

      if (input.attributes) {
        const variant = await this.variantRepo.findById(input.id, tx);
        if (!variant) throw new BadRequestException('Variant no encontrado');

        const product = await this.productRepo.findById(ProductId.create(variant.getProductId().value), tx);
        if (!product) throw new BadRequestException('Producto no encontrado');

        sku = buildSkuPreservingSeries(
          variant.getSku(),
          product.getName(),
          input.attributes?.color,
          input.attributes?.size,
        );
      }

      const updated = await this.variantRepo.update(
        {
          id: input.id,
          sku,
          barcode: input.barcode,
          attributes: input.attributes,
          price: input.price !== undefined ? Money.create(input.price) : undefined,
          cost: input.cost !== undefined ? Money.create(input.cost) : undefined,
        },
        tx,
      );

      if (!updated) throw new BadRequestException('Variant no encontrado');
      return this.toOutput(updated);
    });
  }

  private toOutput(v: ProductVariant): ProductVariantOutput {
    return {
      id: v.getId(),
      productId: v.getProductId().value,
      sku: v.getSku(),
      barcode: v.getBarcode(),
      attributes: v.getAttributes(),
      price: v.getPrice().getAmount(),
      cost: v.getCost().getAmount(),
      isActive: v.getIsActive(),
      createdAt: v.getCreatedAt(),
    };
  }
}
