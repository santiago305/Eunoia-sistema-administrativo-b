import { DataSource } from "typeorm";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogDocumentSerieEntity } from "../../adapters/out/persistence/typeorm/entities/document-serie.entity";

export const seedDocumentSeries = async (dataSource: DataSource, warehouseId: string): Promise<void> => {
  const repo = dataSource.getRepository(ProductCatalogDocumentSerieEntity);
  const defaults = [
    { code: "IN", name: "Ingreso", docType: DocType.IN },
    { code: "OUT", name: "Salida", docType: DocType.OUT },
    { code: "TRF", name: "Transferencia", docType: DocType.TRANSFER },
    { code: "ADJ", name: "Ajuste", docType: DocType.ADJUSTMENT },
    { code: "PRO", name: "Produccion", docType: DocType.PRODUCTION },
  ];

  for (const item of defaults) {
    const exists = await repo.findOne({ where: { warehouseId, code: item.code } });
    if (exists) continue;
    await repo.save(
      repo.create({
        code: item.code,
        name: item.name,
        docType: item.docType,
        warehouseId,
        nextNumber: 1,
        padding: 6,
        separator: "-",
        isActive: true,
      }),
    );
  }
};
