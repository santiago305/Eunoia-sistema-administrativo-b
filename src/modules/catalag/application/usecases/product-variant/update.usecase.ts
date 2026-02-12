import { Inject, BadRequestException } from "@nestjs/common";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalag/domain/ports/product.repository";
import { UpdateProductVariantInput } from "../../dto/product-variants/input/update-product-variant";
import { Money } from "src/modules/catalag/domain/value-object/money.vo";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { buildSkuPreservingSeries } from "src/shared/utilidades/utils/updateSku";

export class UpdateProductVariant {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_VARIANT)
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

        const product = await this.productRepo.findById(variant.productId.value, tx);
        if (!product) throw new BadRequestException('Producto no encontrado');

        sku = buildSkuPreservingSeries(
          variant.sku,
          (product as any).name,
          input.attributes?.color,
          input.attributes?.size,
        );
      }

      const updated = await this.variantRepo.update({
        id: input.id,
        sku,
        barcode: input.barcode,
        attributes: input.attributes,
        price: input.price !== undefined ? new Money(input.price) : undefined,
        cost: input.cost !== undefined ? new Money(input.cost) : undefined,
      }, tx);

      if (!updated) {
        throw new BadRequestException("Variant no encontrado");
      }

      return this.toOutput(updated);
    });
  }

  private toOutput(v: any): ProductVariantOutput {
    return {
      id: v.id,
      productId: v.product_id?.value ?? v.productId,
      sku: v.sku,
      barcode: v.barcode,
      attributes: v.attributes,
      price: v.price?.getAmount?.() ?? v.price,
      cost: v.cost?.getAmount?.() ?? v.cost,
      isActive: v.isActive,
      createdAt: v.createdAt,
    };
  }
}
