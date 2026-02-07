import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../../domain/ports/document-series.repository.port';
import { GetDocumentInput } from '../../dto/inputs';
import { DocumentDetailOutput } from '../../dto/outputs';

@Injectable()
export class GetDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
  ) {}

  async execute(input: GetDocumentInput): Promise<DocumentDetailOutput> {
    const result = await this.documentRepo.getByIdWithItems(input.docId);
    if (!result) {
      throw new BadRequestException('Documento no encontrado');
    }

    const { doc, items } = result;
    const serie = await this.seriesRepo.findById(doc.serieId);
    if (!serie) {
      throw new BadRequestException('Serie invalida');
    }

    return {
      doc: {
        id: doc.id!,
        docType: doc.docType,
        status: doc.status,
        serieId: {
          id: serie.id,
          code: serie.code,
          name: serie.name,
        },
        createdAt: doc.createdAt,
      },
      items: items.map((i) => ({
        id: i.id!,
        docId: i.docId,
        variantId: i.variantId,
        quantity: i.quantity,
        unitCost: i.unitCost ?? null,
      })),
    };
  }
}
