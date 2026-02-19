import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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

  async execute(input: CreateProductVariantInput): Promise<{message:string, type:string}> {
    console.log("[CreateProductVariant] input.attributes:", input.attributes);
    const productId = ProductId.create(input.productId);

    const product = await this.productRepo.findById(productId);
    if (!product) throw new NotFoundException('Producto no encontrado');

    if (input.barcode?.trim()) {
      const existsBarcode = await this.variantRepo.findByBarcode(input.barcode.trim());
      if (existsBarcode) throw new ConflictException('Barcode ya existe');
    }

    const explicitSku = input.sku?.trim();
    if (explicitSku) {
      const existsSku = await this.variantRepo.findBySku(explicitSku);
      if (existsSku) throw new ConflictException('SKU ya existe');
    }

    const maxAttempts = explicitSku ? 1 : 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const sku =
        explicitSku ??
        (await generateUniqueSku(
          this.variantRepo,
          product.getName(),
          input.attributes?.color,
          input.attributes?.variant,
          input.attributes?.presentation,
        ));
      console.log("[CreateProductVariant] generated sku:", sku);

      const variant = new ProductVariant(
        undefined,
        productId,
        sku,
        input.barcode?.trim() || null,
        input.attributes ?? {},
        Money.create(input.price),
        Money.create(input.cost),
        input.isActive ?? true,
        this.clock.now(),
        input.baseUnitId,
      );

      try {
        const created = await this.variantRepo.create(variant);
        return {
          message: "¡Varitante create con exito!",
          type: "success"
        };
      } catch (error: any) {
        const dbUniqueViolation = error?.code === '23505';
        if (dbUniqueViolation && !explicitSku && attempt < maxAttempts) {
          continue;
        }
        if (dbUniqueViolation) {
          throw new ConflictException('SKU o barcode ya existe');
        }
        throw new InternalServerErrorException('No se pudo crear la variante');
      }
    }

    throw new BadRequestException('No se pudo generar un SKU unico');
  }
}
