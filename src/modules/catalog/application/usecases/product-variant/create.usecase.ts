import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PRODUCT_REPOSITORY, ProductRepository } from 'src/modules/catalog/domain/ports/product.repository';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from 'src/modules/catalog/domain/ports/product-variant.repository';
import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/modules/catalog/domain/value-object/money.vo';
import { VariantAttributes } from 'src/modules/catalog/domain/value-object/variant-attributes.vo';
import { CreateProductVariantInput } from '../../dto/product-variants/input/create-product-variant';
import { CLOCK, ClockPort } from 'src/modules/inventory/domain/ports/clock.port';
import { generateUniqueSku } from '../../../../../shared/application/usecases/generate-unique-sku';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { SKU_COUNTER_REPOSITORY, SkuCounterRepository } from 'src/modules/catalog/domain/ports/sku-counter.repository';
import { CreateStockItemForVariant } from 'src/modules/inventory/application/use-cases/stock-item/create-for-variant.usecase';

export class CreateProductVariant {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
    @Inject(SKU_COUNTER_REPOSITORY)
    private readonly skuCounterRepo: SkuCounterRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly createStockItemForVariant: CreateStockItemForVariant,
  ) {}

  async execute(
    input: CreateProductVariantInput,
  ): Promise<{ message: string; type: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const productId = ProductId.create(input.productId);

      const product = await this.productRepo.findById(productId, tx);
      if (!product) throw new NotFoundException({type: 'error', message: 'Producto no encontrado'});

      const normalizedBarcode = input.barcode?.trim() || null;
      const normalizedCustomSku = input.customSku?.trim() || null;
      if (normalizedBarcode) {
        const existsBarcode = await this.variantRepo.findByBarcode(normalizedBarcode, tx);
        if (existsBarcode) throw new ConflictException({type: 'error', message: 'Barcode ya existe'});
      }

    const explicitSku = input.sku?.trim();
    if (explicitSku) {
      const existsSku = await this.variantRepo.findBySku(explicitSku, tx);
      if (existsSku) throw new ConflictException({type: 'error', message: 'SKU ya existe'});
    }

    let attributes: Record<string, unknown>;

    try {
      attributes = VariantAttributes.create(input.attributes).toJSON();
    } catch {
      throw new BadRequestException({ type: "error", message: "Attributes inválidos" });
    }

    const next = await this.skuCounterRepo.reserveNext(tx); // global
      if (!Number.isFinite(next) || next <= 0) {
        throw new InternalServerErrorException({
          type: 'error',
          message: `No se pudo generar correlativo`,
        });
      }
    
      const sku = `${String(next).padStart(5, '0')}`;

    const variant = new ProductVariant(
      undefined,
      productId,
      sku,
      normalizedBarcode,
      input.attributes,
      Money.create(input.price),
      Money.create(input.cost),
      input.isActive ?? true,
      this.clock.now(),
      normalizedCustomSku,
    );

    let create:ProductVariant;
    try {
      create = await this.variantRepo.create(variant, tx);
    } catch  {
      throw new BadRequestException({type: 'error', message: 'No se pudo crear la variante'});
    }
    
    try {
      await this.createStockItemForVariant.execute(
        {
          variantId: create.getId(),
          isActive: input.isActive,
        },
        tx,
      );
    } catch {
      throw new BadRequestException({type: 'error', message: 'No se pudo crear el stock item'});
    }

    return {
      type: "success",
      message: "¡Variante creada con éxito!",
    };
  });
  }
}
