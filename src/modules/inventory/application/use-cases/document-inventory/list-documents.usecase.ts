import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../../domain/ports/document-series.repository.port';
import { ListDocumentsInput } from '../../dto/document/input/document-list';
import { PaginatedDocumentOutputResult } from '../../dto/document/output/document-paginated';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { errorResponse } from 'src/shared/response-standard/response';
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from 'src/modules/warehouses/domain/ports/warehouse.repository.port';
import { WarehouseId } from 'src/modules/warehouses/domain/value-objects/warehouse-id.vo';

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
      result.items.map(async (d) => {
        let serie = cache.get(d.serieId);
        if (!serie) {
          const s = await this.seriesRepo.findById(d.serieId);
          if (!s) {
            throw new BadRequestException(errorResponse('Serie invalida'));
          }
          serie = { id: s.id, code: s.code, correlative: s.nextNumber };
          cache.set(d.serieId, serie);
        }

        let user = await this.userReadRepo.findManagementById(d.createdBy);
        if (!user) {
          throw new BadRequestException(errorResponse('Usuario creador del documento no encontrado'));            
        }

        const toWarehouse = d.toWarehouseId
          ? await this.warehouseRepo.findById(new WarehouseId(d.toWarehouseId))
          : null;
        const fromWarehouse = d.fromWarehouseId
          ? await this.warehouseRepo.findById(new WarehouseId(d.fromWarehouseId))
          : null;

        if(!toWarehouse && d.toWarehouseId) {
          throw new BadRequestException(errorResponse('Almacen destino no encontrado'));
        }

        if(!fromWarehouse && d.fromWarehouseId) {
          throw new BadRequestException(errorResponse('Almacen origen no encontrado'));
        }
        return {
          id: d.id!,
          docType: d.docType,
          status: d.status,
          serie: serie.code,
          correlative: d.correlative,
          toWarehouse: toWarehouse?.name,
          fromWarehouse: fromWarehouse?.name,
          createdBy: user,
          createdAt: d.createdAt,
        };

      }),
    );

    return {
      items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
