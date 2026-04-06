import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentIdInput } from '../../dto/document/input/document-id';
import { DocumentDetailOutput } from '../../dto/document/output/document-detail-out';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../ports/document-series.repository.port';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../ports/document.repository.port';
import { DocumentOutputMapper } from '../../mappers/document-output.mapper';
import { DocumentNotFoundApplicationError } from '../../errors/document-not-found.error';

@Injectable()
export class GetDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
  ) {}

  async execute(input: DocumentIdInput): Promise<DocumentDetailOutput> {
    const result = await this.documentRepo.getByIdWithItems(input.docId);
    if (!result) {
      throw new NotFoundException(new DocumentNotFoundApplicationError().message);
    }

    const serie = await this.seriesRepo.findById(result.doc.serieId);
    if (!serie) {
      throw new NotFoundException('Serie no encontrada');
    }

    return DocumentOutputMapper.toDetailOutput({
      doc: result.doc,
      serieCode: serie.code,
      items: result.items,
    });
  }
}
