import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PostDocumentInput } from "../../dto/document/input/document-post";
import { DocumentNotFoundApplicationError } from "../../errors/document-not-found.error";
import { CLOCK, ClockPort } from "../../ports/clock.port";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "../../ports/document.repository.port";

@Injectable()
export class CancelDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
  ) {}

  async execute(input: PostDocumentInput): Promise<{ status: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const doc = await this.documentRepo.findById(input.docId, tx);

      if (!doc) {
        throw new NotFoundException(new DocumentNotFoundApplicationError().message);
      }

      if (!doc.isDraft()) {
        throw new BadRequestException("Solo se puede cancelar documentos en DRAFT");
      }

      await this.documentRepo.markCancelled(
        {
          docId: doc.id!,
          postedBy: input.postedBy,
          note: input.note,
          postedAt: this.clock.now(),
        },
        tx,
      );

      return { status: "Documento cancelado con exito" };
    });
  }
}
