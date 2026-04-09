import { BadRequestException, ConflictException, Inject, InternalServerErrorException } from "@nestjs/common";
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
import { ProductFactory } from "src/modules/catalog/domain/factories/product.factory";
import { CatalogOutputMapper } from "../../mappers/catalog-output.mapper";

export class CreateProduct {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(SKU_COUNTER_REPOSITORY) private readonly skuCounterRepo: SkuCounterRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(PRODUCT_EQUIVALENCE_REPOSITORY) private readonly equivalenceRepo: ProductEquivalenceRepository,
    private readonly createStockItemForProduct: CreateStockItemForProduct,
  ) {}

  async execute(input: CreateProductInput) {
    return this.uow.runInTransaction(async (tx) => {
      const now = this.clock.now();

      const normalizedBarcode = input.barcode?.trim() || null;
      const normalizedCustomSku = input.customSku?.trim() || null;

      if (normalizedBarcode) {
        const existsBarcode = await this.productRepo.findByBarcode(normalizedBarcode, tx);
        if (existsBarcode) throw new ConflictException("Barcode ya existe");
      }

      const explicitSku = input.sku?.trim();
      if (explicitSku) {
        const existsSku = await this.productRepo.findBySku(explicitSku, tx);
        if (existsSku) throw new ConflictException("SKU ya existe");
      }

      let attributes: Record<string, unknown>;
      try {
        attributes = VariantAttributes.create(input.attributes).toJSON();
      } catch {
        throw new BadRequestException("Atributos inválidos");
      }

      const next = await this.skuCounterRepo.reserveNext(tx);
      if (!Number.isFinite(next) || next <= 0) {
        throw new InternalServerErrorException("No se pudo generar correlativo");
      }

      const sku = `${String(next).padStart(5, "0")}`;

      const product = ProductFactory.create({
        baseUnitId: input.baseUnitId,
        name: input.name,
        description: input.description ?? null,
        sku,
        barcode: normalizedBarcode,
        price: Money.create(input.price),
        cost: Money.create(input.cost),
        minStock: input.minStock ?? null,
        attributes,
        isActive: input.isActive ?? true,
        type: input.type,
        createdAt: now,
        updatedAt: null,
        customSku: normalizedCustomSku,
      });

      let createdProduct;
      try {
        createdProduct = await this.productRepo.create(product, tx);
      } catch {
        throw new InternalServerErrorException("No se logró crear el producto, por favor intente de nuevo");
      }

      const productId = createdProduct.getId()?.value;
      if (!productId) {
        throw new InternalServerErrorException("No se logró crear el producto, por favor intente de nuevo");
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
        throw new InternalServerErrorException("No se logró crear la equivalencia de unidad base");
      }

      try {
        await this.createStockItemForProduct.execute(
          {
            productId,
            isActive: createdProduct.getIsActive(),
          },
          tx,
        );
      } catch {
        throw new InternalServerErrorException("No se pudo crear el stock item");
      }

      return CatalogOutputMapper.toProductOutput(createdProduct);
    });
  }
}
