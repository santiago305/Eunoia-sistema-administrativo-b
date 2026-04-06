import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ProductId } from 'src/modules/catalog/domain/value-object/product-id.vo';
import { Money } from 'src/shared/value-objets/money.vo';
import { VariantAttributes } from 'src/modules/catalog/domain/value-object/variant-attributes.vo';
import { CreateProductVariantInput } from '../../dto/product-variants/input/create-product-variant';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { CreateStockItemForVariant } from 'src/modules/inventory/application/use-cases/stock-item/create-for-variant.usecase';
import { CLOCK, ClockPort } from 'src/modules/inventory/application/ports/clock.port';
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from '../../ports/product-variant.repository';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../ports/product.repository';
import { SKU_COUNTER_REPOSITORY, SkuCounterRepository } from '../../ports/sku-counter.repository';
import { ProductVariantFactory } from 'src/modules/catalog/domain/factories/product-variant.factory';
import { CatalogOutputMapper } from '../../mappers/catalog-output.mapper';
import { ProductNotFoundApplicationError } from '../../errors/product-not-found.error';

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

  async execute(input: CreateProductVariantInput) {
    return this.uow.runInTransaction(async (tx) => {
      const productId = ProductId.create(input.productId);
      const product = await this.productRepo.findById(productId, tx);

      if (!product) {
        throw new NotFoundException(new ProductNotFoundApplicationError().message);
      }

      const normalizedBarcode = input.barcode?.trim() || null;
      const normalizedCustomSku = input.customSku?.trim() || null;

      if (normalizedBarcode) {
        const existsBarcode = await this.variantRepo.findByBarcode(normalizedBarcode, tx);
        if (existsBarcode) throw new ConflictException('Barcode ya existe');
      }

      const explicitSku = input.sku?.trim();
      if (explicitSku) {
        const existsSku = await this.variantRepo.findBySku(explicitSku, tx);
        if (existsSku) throw new ConflictException('SKU ya existe');
      }

      try {
        VariantAttributes.create(input.attributes);
      } catch {
        throw new BadRequestException("Atributos inválidos");
      }

      const next = await this.skuCounterRepo.reserveNext(tx);
      if (!Number.isFinite(next) || next <= 0) {
        throw new InternalServerErrorException('No se pudo generar correlativo');
      }

      const sku = `${String(next).padStart(5, '0')}`;

      const variant = ProductVariantFactory.create({
        productId,
        sku,
        barcode: normalizedBarcode,
        attributes: input.attributes,
        price: Money.create(input.price),
        cost: Money.create(input.cost),
        isActive: input.isActive ?? true,
        createdAt: this.clock.now(),
        customSku: normalizedCustomSku,
      });

      let created;
      try {
        created = await this.variantRepo.create(variant, tx);
      } catch {
        throw new BadRequestException('No se pudo crear la variante');
      }

      try {
        await this.createStockItemForVariant.execute(
          {
            variantId: created.getId(),
            isActive: input.isActive,
          },
          tx,
        );
      } catch {
        throw new BadRequestException('No se pudo crear el stock item');
      }

      return {
        type: "success",
        message: "Variante creada con éxito",
        variant: CatalogOutputMapper.toProductVariantOutput(created),
      };
    });
  }
}
