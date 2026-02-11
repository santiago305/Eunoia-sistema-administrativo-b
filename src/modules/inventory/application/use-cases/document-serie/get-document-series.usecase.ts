import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../../domain/ports/document-series.repository.port';
import { GetActiveDocumentSerieInput } from '../../dto/document-serie/input/get-active-document-serie';
import { DocumentSerieDetailOutput } from '../../dto/document-serie/output/document-serie-detail-out';

@Injectable()
export class GetActiveDocumentSerieUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
  ) {}

  async execute(input: GetActiveDocumentSerieInput): Promise<DocumentSerieDetailOutput> {
    const series = await this.seriesRepo.findActiveFor({
      docType: input.docType,
      warehouseId: input.warehouseId,
      isActive: input.isActive,
    });

    if (!series || series.length === 0) {
      throw new BadRequestException('Serie activa no encontrada');
    }

    return {
      items: series.map((serie) => ({
        id: serie.id,
        code: serie.code,
        name: serie.name,
        docType: serie.docType,
        warehouseId: serie.warehouseId,
        nextNumber: serie.nextNumber,
        isActive: serie.isActive,
        createdAt: serie.createdAt
      })),
    };
  }
}
