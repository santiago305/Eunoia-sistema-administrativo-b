import { Inject } from "@nestjs/common";
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from "src/modules/catalog/domain/ports/product.repository";
import {
  PRODUCT_VARIANT_REPOSITORY,
  ProductVariantRepository,
} from "src/modules/catalog/domain/ports/product-variant.repository";
import { RowMaterial } from "src/modules/catalog/domain/read-models/row-materials";

export class ListRowMaterialProductVariants {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(): Promise<RowMaterial[]> {
    const [products, variants] = await Promise.all([
      this.productRepo.listRowMaterialProduct(),
      this.variantRepo.listRowMaterialVariant(),
    ]);

    const rows = [...products, ...variants];

    rows.sort((a, b) => a.sku.localeCompare(b.sku));

    return rows.map((row) => ({
      primaId: row.primaId,
      productName: row.productName,
      productDescription: row.productDescription,
      baseUnitId: row.baseUnitId,
      sku: row.sku,
      unitCode: row.unitCode,
      unitName: row.unitName,
    }));
  }
}
