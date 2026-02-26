import { Inject } from "@nestjs/common";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "src/modules/catalog/domain/ports/product-variant.repository";
import { RowMaterial } from "src/modules/catalog/domain/read-models/row-materials";

export class ListRowMaterialProductVariants {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(): Promise<RowMaterial[]> {
    const rows = await this.variantRepo.listRowMaterial();
    return rows.map((row) => {
      return {
        primaId: row.primaId,
        productName: row.productName,
        productDescription: row.productDescription,
        baseUnitId: row.baseUnitId,
        sku: row.sku,
        unitCode: row.unitCode,
        unitName: row.unitName,
      };
    });
  }
}
