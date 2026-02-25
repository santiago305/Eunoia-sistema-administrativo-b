import { ConflictException, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from 'src/modules/catalog/domain/ports/product-variant.repository';
import { PRODUCT_REPOSITORY, ProductRepository } from 'src/modules/catalog/domain/ports/product.repository';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
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

      let sku = current.getSku();

      // Si mandan sku explícito, se respeta
      if (input.sku?.trim()) {
        sku = input.sku.trim();
      }

      // Si mandan attributes, recalculamos SKU preservando serie
      if (input.attributes) {
        const product = await this.productRepo.findById(current.getProductId(), tx);
        if (!product) throw new NotFoundException({type: 'error', message: 'Producto no encontrado'});

        sku = buildSkuPreservingSeries(
          sku,
          product.getName(),
          input.attributes?.color,
          input.attributes?.presentation,
          input.attributes?.variant,
        );
      }

      const updated = await this.variantRepo.update(
        {
          id: input.id,
          sku,
          barcode: input.barcode === null ? null : input.barcode?.trim() ?? undefined,
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
      barcode: v.getBarcode(),
      attributes: v.getAttributes(),
      price: v.getPrice().getAmount(),
      cost: v.getCost().getAmount(),
      isActive: v.getIsActive(),
      createdAt: v.getCreatedAt(),
    };
  }
}

