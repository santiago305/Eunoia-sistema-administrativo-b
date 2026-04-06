import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetDocumentSerieInput } from '../../dto/document-serie/input/get-document-serie-by-id';
import { DocumentSerieOutput } from '../../dto/document-serie/output/document-serie-out';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../ports/document-series.repository.port';
import { DocumentSerieOutputMapper } from '../../mappers/document-serie-output.mapper';
import { DocumentSerieNotFoundApplicationError } from '../../errors/document-serie-not-found.error';

@Injectable()
export class GetDocumentSerieUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
  ) {}

  async execute(input: GetDocumentSerieInput): Promise<DocumentSerieOutput> {
    const serie = await this.seriesRepo.findById(input.id);
    if (!serie) {
      throw new NotFoundException(new DocumentSerieNotFoundApplicationError().message);
    }

    return DocumentSerieOutputMapper.toOutput(serie);
  }
}
