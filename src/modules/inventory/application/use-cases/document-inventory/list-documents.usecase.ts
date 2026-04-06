import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ListDocumentsInput } from '../../dto/document/input/document-list';
import { PaginatedDocumentOutputResult } from '../../dto/document/output/document-paginated';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { WarehouseId } from 'src/modules/warehouses/domain/value-objects/warehouse-id.vo';
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from 'src/modules/warehouses/application/ports/warehouse.repository.port';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../ports/document-series.repository.port';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../ports/document.repository.port';
import { DocumentOutputMapper } from '../../mappers/document-output.mapper';

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepo: UserReadRepository,
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly warehouseRepo: WarehouseRepository,
  ) {}

  async execute(input: ListDocumentsInput): Promise<PaginatedDocumentOutputResult> {
    const result = await this.documentRepo.list(input);
    const cache = new Map<string, { id: string; code: string; correlative: number }>();

    const items = await Promise.all(
      result.items.map(async (doc) => {
        let serie = cache.get(doc.serieId);
        if (!serie) {
          const foundSerie = await this.seriesRepo.findById(doc.serieId);
          if (!foundSerie) {
            throw new NotFoundException('Serie no encontrada');
          }
          serie = { id: foundSerie.id, code: foundSerie.code, correlative: foundSerie.nextNumber };
          cache.set(doc.serieId, serie);
        }

        const user = await this.userReadRepo.findManagementById(doc.createdBy);
        if (!user) {
          throw new NotFoundException('Usuario creador del documento no encontrado');
        }

        const toWarehouse = doc.toWarehouseId
          ? await this.warehouseRepo.findById(new WarehouseId(doc.toWarehouseId))
          : null;
        const fromWarehouse = doc.fromWarehouseId
          ? await this.warehouseRepo.findById(new WarehouseId(doc.fromWarehouseId))
          : null;

        if (!toWarehouse && doc.toWarehouseId) {
          throw new NotFoundException('Almacen destino no encontrado');
        }

        if (!fromWarehouse && doc.fromWarehouseId) {
          throw new NotFoundException('Almacen origen no encontrado');
        }

        return {
          id: doc.id!,
          docType: doc.docType,
          status: doc.status,
          serie: serie.code,
          correlative: doc.correlative,
          toWarehouse: toWarehouse?.name,
          fromWarehouse: fromWarehouse?.name,
          createdBy: user,
          createdAt: doc.createdAt,
        };
      }),
    );

    return DocumentOutputMapper.toPaginatedOutput({
      items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }
}
