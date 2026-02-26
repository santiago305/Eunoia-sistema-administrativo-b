import { BadRequestException, ConflictException, Inject, InternalServerErrorException } from "@nestjs/common";
import { Product } from "src/modules/catalog/domain/entity/product";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalog/domain/ports/product.repository";
import { CreateProductInput } from "../../dto/products/input/create-product";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { VariantAttributes } from "src/modules/catalog/domain/value-object/variant-attributes.vo";
import { generateUniqueSku } from "src/shared/application/usecases/generate-unique-sku";
import { SKU_COUNTER_REPOSITORY, SkuCounterRepository } from "src/modules/catalog/domain/ports/sku-counter.repository";

export class CreateProduct {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(SKU_COUNTER_REPOSITORY) private readonly skuCounterRepo: SkuCounterRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    return this.uow.runInTransaction(async (tx) => {
      const now = this.clock.now();

      const normalizedBarcode = input.barcode?.trim() || null;
      if (normalizedBarcode) {
        const existsBarcode = await this.productRepo.findByBarcode(normalizedBarcode, tx);
        if (existsBarcode) throw new ConflictException({type: 'error', message: 'Barcode ya existe'});
      }
  
      const explicitSku = input.sku?.trim();
      if (explicitSku) {
        const existsSku = await this.productRepo.findBySku(explicitSku, tx);
        if (existsSku) throw new ConflictException({type: 'error', message: 'SKU ya existe'});
      }

      let sku = explicitSku;
      let attributes: Record<string, unknown>;

      try {
        attributes = VariantAttributes.create(input.attributes).toJSON();
      } catch {
        throw new BadRequestException({ type: "error", message: "Attributes inválidos" });
      }

      if (!sku) {
        sku = await generateUniqueSku(
          this.skuCounterRepo,
          input.name,
          input.attributes?.color,
          input.attributes?.presentation,
          input.attributes?.variant,
          tx,
        );
      }

      const product = new Product(
        undefined,
        input.baseUnitId,
        input.name,
        input.description ?? null,
        sku,
        normalizedBarcode,
        Money.create(input.price),
        Money.create(input.cost),
        attributes,
        input.isActive ?? true,
        input.type,
        now,
        null,
      );

      try { 
        return await this.productRepo.create(product, tx);
      } catch {
        throw new InternalServerErrorException({
          type: "error",
          message: "No se logro crear el producto, por favor intente de nuevo",
        });
      }
    });
  }
}
