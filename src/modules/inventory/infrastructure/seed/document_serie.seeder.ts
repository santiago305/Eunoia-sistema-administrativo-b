import { DataSource } from 'typeorm';
import { DocumentSerie } from '../../adapters/out/typeorm/entities/document_serie.entity';
import { DocType } from '../../domain/value-objects/doc-type';
import { CreateDocumentSerieUseCase } from '../../application/use-cases/document-serie/create-document-serie.usecase';
import { DocumentSeriesTypeormRepository } from '../../adapters/out/typeorm/repositories/document_serie.typeorm.repo';

// Warehouse de prueba (temporal)
const TEST_WAREHOUSE_ID = '00000000-0000-0000-0000-000000000001';

export const seedDocumentSeries = async (
  dataSource: DataSource,
  warehouseId: string = TEST_WAREHOUSE_ID,
): Promise<void> => {
  const repo = dataSource.getRepository(DocumentSerie);
  const seriesRepo = new DocumentSeriesTypeormRepository(repo);
  const createSerie = new CreateDocumentSerieUseCase(seriesRepo);

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
    {
      code: 'PRO',
      name: 'Produccion',
      docType: DocType.PRODUCTION,
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

    await createSerie.execute({
      code: serie.code,
      name: serie.name,
      docType: serie.docType,
      warehouseId: warehouseId,
      nextNumber: 1,
      padding: 6,
      separator: '-',
      isActive: true,
    });

    console.log(
      `Serie ${serie.code} creada para docType=${DocType[serie.docType]}`,
    );
  }
};
