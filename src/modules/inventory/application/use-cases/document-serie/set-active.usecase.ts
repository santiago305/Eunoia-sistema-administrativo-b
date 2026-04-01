import { Inject, BadRequestException, Injectable } from "@nestjs/common";
import { SetDocumentSerieInput } from "../../dto/document-serie/input/set-active-document-serie";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "../../ports/document-series.repository.port";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "../../ports/document.repository.port";

@Injectable()
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
