import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../../../domain/ports/document-series.repository.port';
import { CreateDocumentInput } from '../../dto/inputs';
import { DocumentOutput } from '../../dto/outputs';
import { InventoryDocument } from '../../../domain/entities/inventory-document';
import { DocStatus } from '../../../domain/value-objects/doc-status';
import { InventoryRulesService } from '../../../domain/services/inventory-rules.service';

@Injectable()
export class CreateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
    private readonly rules: InventoryRulesService,
  ) {}

  async execute(input: CreateDocumentInput): Promise<DocumentOutput> {
    if (!input.docType || !input.serieId) {
      throw new BadRequestException('docType y serieId son obligatorios');
    }
    const serie = await this.seriesRepo.findById(input.serieId);
    if (!serie) {
      throw new BadRequestException('Serie invalida');
    }

    const doc = new InventoryDocument(
      undefined,
      input.docType,
      DocStatus.DRAFT,
      input.serieId,
      input.fromWarehouseId,
      input.toWarehouseId,
      input.referenceId,
      input.referenceType,
      input.note,
      input.createdBy,
    );

    const saved = await this.documentRepo.createDraft(doc);

    return {
      id: saved.id!,
      docType: saved.docType,
      status: saved.status,
      serieId: {
        id: serie.id,
        code: serie.code,
        name: serie.name,
      },
      createdAt: saved.createdAt,
    };
  }
}
