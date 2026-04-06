import { Inject } from "@nestjs/common";
import { RowMaterial } from "src/modules/catalog/domain/read-models/row-materials";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "../../ports/product-variant.repository";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";

export class ListRowMaterialProductVariants {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(row?:boolean): Promise<RowMaterial[]> {
    //reutilizo la misma funcion pero ahora listo los productos terminados en ves
    //de las materias primas

    const [products, variants] = await Promise.all([
      this.productRepo.listRowMaterialProduct(row),
      this.variantRepo.listRowMaterialVariant(row),
    ]);

    const rows = [...products, ...variants];

    rows.sort((a, b) => a.sku.localeCompare(b.sku));

    return rows.map((r) => ({
      ...(row ? { primaId: r.primaId } : { itemId: r.primaId }),
      productName: r.productName,
      productDescription: r.productDescription,
      baseUnitId: r.baseUnitId,
      sku: r.sku,
      unitCode: r.unitCode,
      unitName: r.unitName,
      type: r.type,
      attributes: r.attributes,
      customSku: r.customSku,
    }));
  }
}
