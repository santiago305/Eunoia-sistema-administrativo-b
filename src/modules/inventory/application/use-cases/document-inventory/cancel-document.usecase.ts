import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { PostDocumentInput } from '../../dto/document/input/document-post';
import { CLOCK, ClockPort } from 'src/modules/inventory/domain/ports/clock.port';
import { UNIT_OF_WORK, UnitOfWork } from 'src/modules/inventory/domain/ports/unit-of-work.port';

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

  async execute(input: PostDocumentInput): Promise<{ status:string }> {
    return this.uow.runInTransaction(async (tx) => {
       const doc = await this.documentRepo.findById(input.docId, tx);
      if (!doc) {
        throw new BadRequestException('Documento no encontrado');
      }
      if (!doc.isDraft()) {
        throw new BadRequestException('Solo se puede cancelar documentos en DRAFT');
      }
      const now = this.clock.now();
      await this.documentRepo.markCancelled(
        { docId: doc.id!, postedBy: input.postedBy, note:input.note , postedAt: now },
          tx,
        );
      return { status: '¡Postedo con exito!' };
    });
  }
}
