import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { InventoryDocument } from "../../../domain/entities/inventory-document";
import { DocStatus } from "../../../domain/value-objects/doc-status";
import { CreateDocumentInput } from "../../dto/document/input/document-create";
import { DocumentOutput } from "../../dto/document/output/document-out";
import { DocumentSerieNotFoundApplicationError } from "../../errors/document-serie-not-found.error";
import { DocumentOutputMapper } from "../../mappers/document-output.mapper";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "../../ports/document.repository.port";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "../../ports/document-series.repository.port";

@Injectable()
export class CreateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: DocumentSeriesRepository,
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
  ) {}

  async execute(input: CreateDocumentInput): Promise<DocumentOutput> {
    return this.uow.runInTransaction(async (tx) => {
      if (!input.docType || !input.serieId) {
        throw new BadRequestException("docType y serieId son obligatorios");
      }

      const serie = await this.seriesRepo.findById(input.serieId);
      if (!serie) {
        throw new NotFoundException(new DocumentSerieNotFoundApplicationError().message);
      }

      if (serie.docType !== input.docType) {
        throw new BadRequestException("docType no coincide con la serie");
      }

      const correlative = await this.seriesRepo.reserveNextNumber(input.serieId, tx);
      const document = new InventoryDocument(
        undefined,
        input.docType,
        DocStatus.DRAFT,
        input.serieId,
        correlative,
        input.fromWarehouseId,
        input.toWarehouseId,
        input.referenceId,
        input.referenceType,
        input.note,
        input.createdBy,
      );

      const saved = await this.documentRepo.createDraft(document);

      return {
        ...DocumentOutputMapper.toDocumentOutput(saved),
        serie: serie.code,
      };
    });
  }
}
