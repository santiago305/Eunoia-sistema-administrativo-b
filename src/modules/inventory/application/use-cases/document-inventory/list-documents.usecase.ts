import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../../domain/ports/document-series.repository.port';
import { ListDocumentsInput } from '../../dto/inputs';
import { PaginatedDocumentOutputResult } from '../../dto/outputs';

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
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
            throw new BadRequestException('Serie invalida');
          }
          serie = { id: s.id, code: s.code, correlative: s.nextNumber };
          cache.set(d.serieId, serie);
        }

        return {
          id: d.id!,
          docType: d.docType,
          status: d.status,
          serie: serie.code,
          correlative: d.correlative,
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
