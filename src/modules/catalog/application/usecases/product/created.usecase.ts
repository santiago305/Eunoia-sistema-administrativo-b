import { BadRequestException, ConflictException, Inject, InternalServerErrorException } from "@nestjs/common";
import { Product } from "src/modules/catalog/domain/entity/product";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { CreateProductInput } from "../../dto/products/input/create-product";
import { Money } from "src/shared/value-objets/money.vo";
import { VariantAttributes } from "src/modules/catalog/domain/value-object/variant-attributes.vo";
import { ProductEquivalence } from "src/modules/catalog/domain/entity/product-equivalence";
import { CreateStockItemForProduct } from "src/modules/inventory/application/use-cases/stock-item/create-for-product.usecase";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";
import { PRODUCT_EQUIVALENCE_REPOSITORY, ProductEquivalenceRepository } from "../../ports/product-equivalence.repository";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { SKU_COUNTER_REPOSITORY, SkuCounterRepository } from "../../ports/sku-counter.repository";

export class CreateProduct {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(SKU_COUNTER_REPOSITORY) private readonly skuCounterRepo: SkuCounterRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(PRODUCT_EQUIVALENCE_REPOSITORY) private readonly equivalenceRepo: ProductEquivalenceRepository,
      private readonly createStockItemForProduct: CreateStockItemForProduct,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    return this.uow.runInTransaction(async (tx) => {
      const now = this.clock.now();

      const normalizedBarcode = input.barcode?.trim() || null;
      const normalizedCustomSku = input.customSku?.trim() || null;
      if (normalizedBarcode) {
        const existsBarcode = await this.productRepo.findByBarcode(normalizedBarcode, tx);
        if (existsBarcode) throw new ConflictException({type: 'error', message: 'Barcode ya existe'});
      }
  
      const explicitSku = input.sku?.trim();
      if (explicitSku) {
        const existsSku = await this.productRepo.findBySku(explicitSku, tx);
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
        normalizedCustomSku,
      );

      let createdProduct: Product;
      try {
        createdProduct = await this.productRepo.create(product, tx);
      } catch {
        throw new InternalServerErrorException({
          type: "error",
          message: "No se logro crear el producto, por favor intente de nuevo",
        });
      }

      const productId = createdProduct.getId()?.value;
      if (!productId) {
        throw new InternalServerErrorException({
          type: "error",
          message: "No se logro crear el producto, por favor intente de nuevo",
        });
      }

      const equivalence = new ProductEquivalence(
        undefined,
        productId,
        input.baseUnitId,
        input.baseUnitId,
        1,
      );

      try {
        await this.equivalenceRepo.create(equivalence, tx);
      } catch {
        throw new InternalServerErrorException({
          type: "error",
          message: "No se logro crear la equivalencia de unidad base",
        });
      }
      
      try {
        await this.createStockItemForProduct.execute(
          {
            productId,
            isActive: createdProduct.getIsActive(),
          },
          tx,
        );
      } catch (err) {
        throw new InternalServerErrorException({
          type: "error",
          message: err,
        });
      }

      return createdProduct;
    });
  }
}
