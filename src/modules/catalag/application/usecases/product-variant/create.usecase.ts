import { Inject, BadRequestException } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalag/domain/ports/product.repository";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { ProductVar } from "src/modules/catalag/domain/entity/product-variant";
import { ProductId } from "src/modules/catalag/domain/value-object/product.vo";
import { Money } from "src/modules/catalag/domain/value-object/money.vo";
import { CreateProductVariantInput } from "../../dto/product-variants/input/create-product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { generateUniqueSku } from "./generate-unique-sku";

export class CreateProductVariant {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT)
    private readonly variantRepo: ProductVariantRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateProductVariantInput): Promise<ProductVariantOutput> {
    const product = await this.productRepo.findById(input.productId);
    if (!product) {
      throw new BadRequestException("Producto no encontrado");
    }
    const existsBarcode = await this.variantRepo.findByBarcode(input.barcode);
    if (existsBarcode) {
      throw new BadRequestException("Barcode ya existe");
    }


    const sku = await generateUniqueSku(
      this.variantRepo,
      input.productId,
      (product as any).name,
      input.attributes?.color,
      input.attributes?.size,
    );
    const variant = new ProductVar(
      undefined,
      new ProductId(input.productId),
      sku,
      input.barcode,
      input.attributes,
      new Money(input.price),
      new Money(input.cost),
      input.isActive ?? true,
      this.clock.now(),
    );

    const created = await this.variantRepo.create(variant);
    return this.toOutput(created, product);
  }

  private toOutput(v: any, product: any): ProductVariantOutput {
    return {
      id: v.id,
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
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
