import { DataSource } from "typeorm";
import { SupplierEntity } from "../../adapters/out/persistence/typeorm/entities/supplier.entity";
import { SupplierDocType } from "../../domain/object-values/supplier-doc-type";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { SupplierMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/supplier-method.entity";

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
  const methodRepo = dataSource.getRepository(PaymentMethodEntity);
  const supplierMethodRepo = dataSource.getRepository(SupplierMethodEntity);
  const methods = await methodRepo.find({ order: { name: "ASC" } });
  if (methods.length === 0) {
    throw new Error("No hay metodos de pago. Ejecuta seedPaymentMethods primero.");
  }
  if (methods.length < 3) {
    throw new Error("Se requieren al menos 3 metodos de pago para asignar a proveedores.");
  }
  const total = Math.min(count, REAL_SUPPLIER_NAMES.length);

  for (let i = 1; i <= total; i++) {
    const supplierName = REAL_SUPPLIER_NAMES[i - 1];
    const documentNumber = `2010000${String(i).padStart(4, "0")}`;

    const existing = await repo.findOne({
      where: { documentType: SupplierDocType.RUC, documentNumber },
    });
    const supplier =
      existing ??
      (await repo.save(
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
      ));

    if (existing) {
      console.log(`Proveedor ${documentNumber} ya existe, omitiendo creacion...`);
    } else {
      console.log(`Proveedor creado: ${supplierName} (${documentNumber})`);
    }

    const methodIndexes = [0, 1, 2].map((offset) => (i - 1 + offset) % methods.length);
    for (const idx of methodIndexes) {
      const method = methods[idx];
      const methodNumber = buildMethodNumber(method.name, i);
      const existingLink = await supplierMethodRepo.findOne({
        where: { supplierId: supplier.id, methodId: method.id },
      });
      if (existingLink) continue;

      await supplierMethodRepo.save(
        supplierMethodRepo.create({
          supplierId: supplier.id,
          methodId: method.id,
          number: methodNumber ?? null,
        }),
      );
    }
  }
};

const buildMethodNumber = (methodName: string, seed: number): string | null => {
  const suffix = String(seed).padStart(6, "0");
  if (methodName === "YAPE" || methodName === "PLIN") {
    return `9${suffix}`;
  }
  if (methodName === "BCP" || methodName === "BBVA") {
    return `00${suffix}123456`;
  }
  if (methodName === "EFECTIVO") {
    return null;
  }
  return null;
};
