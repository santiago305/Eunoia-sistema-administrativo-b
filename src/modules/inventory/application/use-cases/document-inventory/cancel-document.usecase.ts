import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { CancelDocumentInput } from '../../dto/inputs';

@Injectable()
export class CancelDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
  ) {}

  async execute(input: CancelDocumentInput): Promise<{ ok: true }> {
    const doc = await this.documentRepo.findById(input.docId);
    if (!doc) {
      throw new BadRequestException('Documento no encontrado');
    }
    if (!doc.isDraft()) {
      throw new BadRequestException('Solo se puede cancelar documentos en DRAFT');
    }

    await this.documentRepo.markCancelled(input.docId);
    return { ok: true };
  }
}
