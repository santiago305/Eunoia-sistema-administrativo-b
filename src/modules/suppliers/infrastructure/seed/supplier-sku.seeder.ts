import { DataSource } from "typeorm";
import { SupplierEntity } from "../../adapters/out/persistence/typeorm/entities/supplier.entity";
import { SupplierSkuEntity } from "../../adapters/out/persistence/typeorm/entities/supplier-sku.entity";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";

export const seedSupplierSkus = async (dataSource: DataSource): Promise<void> => {
  const supplierRepo = dataSource.getRepository(SupplierEntity);
  const supplierSkuRepo = dataSource.getRepository(SupplierSkuEntity);
  const skuRepo = dataSource.getRepository(ProductCatalogSkuEntity);

  const suppliers = await supplierRepo.find({ where: { isActive: true }, order: { tradeName: "ASC" } });
  const skus = await skuRepo.find({
    where: { isActive: true, isPurchasable: true },
    order: { customSku: "ASC" },
  });

  if (suppliers.length === 0 || skus.length === 0) {
    return;
  }

  for (let i = 0; i < skus.length; i++) {
    const sku = skus[i];
    const primarySupplier = suppliers[i % suppliers.length];
    const secondarySupplier = suppliers[(i + 1) % suppliers.length];

    const links = [
      {
        supplierId: primarySupplier.id,
        skuId: sku.id,
        supplierSku: `${primarySupplier.tradeName ?? "SUP"}-${sku.customSku ?? sku.backendSku}`,
        lastCost: Number(sku.cost ?? 0),
        leadTimeDays: primarySupplier.leadTimeDays ?? 1,
      },
      {
        supplierId: secondarySupplier.id,
        skuId: sku.id,
        supplierSku: `${secondarySupplier.tradeName ?? "SUP"}-${sku.backendSku}`,
        lastCost: Number(sku.cost ?? 0),
        leadTimeDays: secondarySupplier.leadTimeDays ?? 2,
      },
    ];

    for (const link of links) {
      const existing = await supplierSkuRepo.findOne({
        where: { supplierId: link.supplierId, skuId: link.skuId },
      });
      if (existing) continue;

      await supplierSkuRepo.save(
        supplierSkuRepo.create({
          supplierId: link.supplierId,
          skuId: link.skuId,
          supplierSku: link.supplierSku,
          lastCost: link.lastCost,
          leadTimeDays: link.leadTimeDays,
        }),
      );
    }
  }
};
