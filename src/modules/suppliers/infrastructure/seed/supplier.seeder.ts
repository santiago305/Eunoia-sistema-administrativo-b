import { DataSource } from "typeorm";
import { SupplierEntity } from "../../adapters/out/persistence/typeorm/entities/supplier.entity";
import { SupplierDocType } from "../../domain/object-values/supplier-doc-type";

const REAL_SUPPLIER_NAMES = [
  "Alicorp",
  "Backus",
  "Gloria",
  "Ransa",
  "Sodimac",
  "Falabella",
  "Tottus",
  "Ripley",
  "Entel",
  "Movistar",
  "Claro",
  "Samsung",
  "LG",
  "Canon",
  "HP",
  "3M",
  "Bayer",
  "Unilever",
  "Nestle",
  "Colgate",
];

export const seedSuppliers = async (dataSource: DataSource, count: number = 10): Promise<void> => {
  const repo = dataSource.getRepository(SupplierEntity);
  const total = Math.min(count, REAL_SUPPLIER_NAMES.length);

  for (let i = 1; i <= total; i++) {
    const supplierName = REAL_SUPPLIER_NAMES[i - 1];
    const documentNumber = `2010000${String(i).padStart(4, "0")}`;

    const existing = await repo.findOne({
      where: { documentType: SupplierDocType.RUC, documentNumber },
    });
    if (existing) {
      console.log(`Proveedor ${documentNumber} ya existe, omitiendo...`);
      continue;
    }

    await repo.save(
      repo.create({
        documentType: SupplierDocType.RUC,
        documentNumber,
        tradeName: supplierName,
        phone: `999000${String(i).padStart(3, "0")}`,
        email: `${supplierName.toLowerCase().replace(/\s+/g, "")}@example.com`,
        address: `Av. ${supplierName} ${i * 10} - Lima`,
        leadTimeDays: 1,
        isActive: true,
      }),
    );

    console.log(`Proveedor creado: ${supplierName} (${documentNumber})`);
  }
};
