import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetActiveDocumentSerieInput } from '../../dto/document-serie/input/get-active-document-serie';
import { DocumentSerieDetailOutput } from '../../dto/document-serie/output/document-serie-detail-out';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../ports/document-series.repository.port';
import { DocumentSerieOutputMapper } from '../../mappers/document-serie-output.mapper';
import { DocumentSerieNotFoundApplicationError } from '../../errors/document-serie-not-found.error';

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
      throw new NotFoundException(new DocumentSerieNotFoundApplicationError().message);
    }

    return DocumentSerieOutputMapper.toDetailOutput(series);
  }
}
