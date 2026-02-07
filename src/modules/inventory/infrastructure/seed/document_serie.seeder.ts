import { DataSource } from 'typeorm';
import { DocumentSerie } from '../../adapters/out/typeorm/entities/document_serie.entity';
import { DocType } from '../../domain/value-objects/doc-type';

// Warehouse de prueba (temporal)
const TEST_WAREHOUSE_ID = '00000000-0000-0000-0000-000000000001';

export const seedDocumentSeries = async (
  dataSource: DataSource,
  warehouseId: string = TEST_WAREHOUSE_ID,
): Promise<void> => {
  const repo = dataSource.getRepository(DocumentSerie);

  const seriesToSeed = [
    {
      code: 'IN',
      name: 'Ingresos de inventario',
      docType: DocType.IN,
    },
    {
      code: 'OUT',
      name: 'Salidas de inventario',
      docType: DocType.OUT,
    },
    {
      code: 'TRF',
      name: 'Transferencias de inventario',
      docType: DocType.TRANSFER,
    },
    {
      code: 'ADJ',
      name: 'Ajustes de inventario',
      docType: DocType.ADJUSTMENT,
    },
  ];

  for (const serie of seriesToSeed) {
    const exists = await repo.findOne({
      where: {
        docType: serie.docType,
        warehouseId: warehouseId,
      },
    });

    if (exists) {
      console.log(
        `Serie ${serie.code} (${DocType[serie.docType]}) ya existe para el almacén, omitiendo`,
      );
      continue;
    }

    const entity = repo.create({
      code: serie.code,
      name: serie.name,
      docType: serie.docType,
      warehouseId: warehouseId,
      nextNumber: 1,
      padding: 6,
      separator: '-',
      isActive: true,
    });

    await repo.save(entity);

    console.log(
      `Serie ${serie.code} creada para docType=${DocType[serie.docType]}`,
    );
  }
};
