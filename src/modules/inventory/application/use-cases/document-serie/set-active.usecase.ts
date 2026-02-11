import { Inject, BadRequestException } from "@nestjs/common";
import { SetDocumentSerieInput } from "../../dto/document-serie/input/set-active-document-serie";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "src/modules/inventory/domain/ports/document-series.repository.port";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/inventory/domain/ports/document.repository.port";
import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";

export class SetDocumentSerieActive {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SERIES_REPOSITORY)
    private readonly serieRepo: DocumentSeriesRepository,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
  ) {}

  async execute(input: SetDocumentSerieInput): Promise<{ status: string }> {
    return this.uow.runInTransaction(async (tx) => {
      if (input.isActive === false) {
        const hasActiveDocs = await this.documentRepo.existsBySerieId(
          input.id,
          {
            excludeStatus: DocStatus.CANCELLED,
          },
          tx,
        );
        if (hasActiveDocs) {
          throw new BadRequestException(
            "No se puede desactivar: la serie tiene documentos emitidos",
          );
        }
      }
      await this.serieRepo.setActive(input.id, input.isActive, tx);
      return { status: '¡Solicitud lograda con exito!' };
    });
  }
}
