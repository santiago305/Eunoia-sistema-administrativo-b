import { Inject, BadRequestException } from "@nestjs/common";
import { PRODUCT_REPOSITORY, ProductRepository } from "src/modules/catalag/domain/ports/product.repository";
import { PRODUCT_VARIANT, ProductVariantRepository } from "src/modules/catalag/domain/ports/product-variant.repository";
import { ProductVar } from "src/modules/catalag/domain/entity/product-variant";
import { ProductId } from "src/modules/catalag/domain/value-object/product.vo";
import { Money } from "src/modules/catalag/domain/value-object/money.vo";
import { CreateProductVariantInput } from "../../dto/product-variants/input/create-product-variant";
import { ProductVariantOutput } from "../../dto/product-variants/output/product-variant-out";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";

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

    const sku = await this.generateUniqueSku(input.productId, (product as any).name);

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
    return this.toOutput(created);
  }

  private async generateUniqueSku(productId: string, productName: string) {
    const prefix = productName.trim().substring(0, 3).toUpperCase().padEnd(3, "X");
    const variants = await this.variantRepo.listByProductId(new ProductId(productId));

    const suffixes = variants
      .map((v: any) => v.sku)
      .filter((sku: string) => typeof sku === "string" && sku.startsWith(`${prefix}-`))
      .map((sku: string) => {
        const part = sku.substring(prefix.length + 1);
        const num = Number(part);
        return Number.isFinite(num) ? num : undefined;
      })
      .filter((n: number | undefined) => n !== undefined) as number[];

    let next = suffixes.length ? Math.max(...suffixes) + 1 : 1;

    for (let i = 0; i < 50; i++) {
      const sku = `${prefix}-${String(next).padStart(5, "0")}`;
      const exists = await this.variantRepo.findBySku(sku);
      if (!exists) return sku;
      next++;
    }

    throw new BadRequestException("No se pudo generar SKU único");
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
