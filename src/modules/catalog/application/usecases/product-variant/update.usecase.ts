import { ConflictException, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { UpdateProductVariantInput } from '../../dto/product-variants/input/update-product-variant';
import { ProductVariantOutput } from '../../dto/product-variants/output/product-variant-out';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from '../../ports/product-variant.repository';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../ports/product.repository';

export class UpdateProductVariant {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: UpdateProductVariantInput): Promise<ProductVariantOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.variantRepo.findById(input.id, tx);
      if (!current) throw new NotFoundException({type: 'error', message: 'Variante no encontrada'});

      // Barcode uniqueness (si se está cambiando)
      if (input.barcode?.trim() && input.barcode.trim() !== (current.getBarcode() ?? '')) {
        const existsBarcode = await this.variantRepo.findByBarcode(input.barcode.trim(), tx);
        if (existsBarcode && existsBarcode.getId() !== current.getId()) {
          throw new ConflictException({type: 'error', message: 'Barcode ya existe'});
        }
      }

      // let sku = current.getSku();

      // // Si mandan sku explícito, se respeta
      // if (input.sku?.trim()) {
      //   sku = input.sku.trim();
      // }
      
      // if (input.attributes) {
      //   const product = await this.productRepo.findById(current.getProductId(), tx);
      //   if (!product) throw new NotFoundException({type: 'error', message: 'Producto no encontrado'});

      //   sku = buildSkuPreservingSeries(
      //     sku,
      //     product.getName(),
      //     input.attributes?.color,
      //     input.attributes?.presentation,
      //     input.attributes?.variant,
      //   );
      // }
      // if (sku !== current.getSku()) {
      //   const existingBySku = await this.variantRepo.findBySku(sku, tx);
      //   if (existingBySku && existingBySku.getId() !== current.getId()) {
      //     throw new ConflictException({type: 'error', message: 'SKU ya existe'});
      //   }
      // }

      const customSku = input.customSku !== undefined ? (input.customSku?.trim() || null) : undefined;
      const updated = await this.variantRepo.update(
        {
          id: input.id,
          barcode: input.barcode === null ? null : input.barcode?.trim() ?? undefined,
          customSku,
          attributes: input.attributes,
          price: input.price !== undefined ? Money.create(input.price) : undefined,
          cost: input.cost !== undefined ? Money.create(input.cost) : undefined,
        },
        tx,
      );

      if (!updated) throw new InternalServerErrorException({type: 'error', message: 'Variante no actualizada, por favor intente de nuevo'});
      return this.toOutput(updated);
    });
  }

  private toOutput(v: ProductVariant): ProductVariantOutput {
    return {
      id: v.getId(),
      productId: v.getProductId().value,
      sku: v.getSku(),
      customSku: v.getCustomSku() ?? null,
      barcode: v.getBarcode(),
      attributes: v.getAttributes(),
      price: v.getPrice().getAmount(),
      cost: v.getCost().getAmount(),
      isActive: v.getIsActive(),
      createdAt: v.getCreatedAt(),
    };
  }
}

