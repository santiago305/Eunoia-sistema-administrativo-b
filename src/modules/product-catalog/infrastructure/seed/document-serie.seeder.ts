import { DataSource } from "typeorm";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductCatalogDocumentSerieEntity } from "../../adapters/out/persistence/typeorm/entities/document-serie.entity";

const buildSaleOrderSerieCode = (index: number) => {
  return `PE${String(index).padStart(2, "0")}`;
};

export const seedDocumentSeries = async (dataSource: DataSource, warehouseId: string): Promise<void> => {
  const repo = dataSource.getRepository(ProductCatalogDocumentSerieEntity);

  const saleOrderSeriesCount = await repo.count({
    where: {
      docType: DocType.SALE_ORDER,
    },
  });

  const saleOrderCode = buildSaleOrderSerieCode(saleOrderSeriesCount + 1);

  const defaults = [
    { code: "IN", name: "Ingreso", docType: DocType.IN },
    { code: "OUT", name: "Salida", docType: DocType.OUT },
    { code: "TRF", name: "Transferencia", docType: DocType.TRANSFER },
    { code: "ADJ", name: "Ajuste", docType: DocType.ADJUSTMENT },
    { code: "PRO", name: "Produccion", docType: DocType.PRODUCTION },
    { code: saleOrderCode, name: "Pedido", docType: DocType.SALE_ORDER },
  ];

  for (const item of defaults) {
    const exists = await repo.findOne({
      where: {
        warehouseId,
        docType: item.docType,
      },
    });

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