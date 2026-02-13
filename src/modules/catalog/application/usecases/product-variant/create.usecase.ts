import { Inject, BadRequestException } from '@nestjs/common';
import { PRODUCT_REPOSITORY, ProductRepository } from 'src/modules/catalog/domain/ports/product.repository';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from 'src/modules/catalog/domain/ports/product-variant.repository';
import { Product } from 'src/modules/catalog/domain/entity/product';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { CreateProductVariantInput } from '../../dto/product-variants/input/create-product-variant';
import { ProductVariantOutput } from '../../dto/product-variants/output/product-variant-out';
import { CLOCK, ClockPort } from 'src/modules/inventory/domain/ports/clock.port';
import { generateUniqueSku } from './generate-unique-sku';

export class CreateProductVariant {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateProductVariantInput): Promise<ProductVariantOutput> {
    const productId = ProductId.create(input.productId);
    const product = await this.productRepo.findById(productId);
    if (!product) throw new BadRequestException('Producto no encontrado');

    if (input.barcode) {
      const existsBarcode = await this.variantRepo.findByBarcode(input.barcode);
      if (existsBarcode) throw new BadRequestException('Barcode ya existe');
    }

    const sku = input.sku?.trim()
      ? input.sku.trim()
      : await generateUniqueSku(
          this.variantRepo,
          input.productId,
          product.getName(),
          input.attributes?.color,
          input.attributes?.size,
        );

    const variant = new ProductVariant(
      undefined as unknown as string,
      productId,
      sku,
      input.barcode,
      input.attributes,
      Money.create(input.price),
      Money.create(input.cost),
      input.isActive ?? true,
      this.clock.now(),
    );

    const created = await this.variantRepo.create(variant);
    return this.toOutput(created, product);
  }

  private toOutput(v: ProductVariant, product: Product): ProductVariantOutput {
    return {
      id: v.getId(),
      productId: product.getId()?.value,
      productName: product.getName(),
      productDescription: product.getDescription(),
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
