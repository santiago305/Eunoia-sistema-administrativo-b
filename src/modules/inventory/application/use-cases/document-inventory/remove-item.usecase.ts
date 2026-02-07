import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { RemoveItemInput } from '../../dto/inputs';

@Injectable()
export class RemoveItemUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
  ) {}

  async execute(input: RemoveItemInput): Promise<{ ok: true }> {
    const doc = await this.documentRepo.findById(input.docId);
    if (!doc) {
      throw new BadRequestException('Documento no encontrado');
    }
    if (!doc.isDraft()) {
      throw new BadRequestException('Solo se puede eliminar items en DRAFT');
    }

    await this.documentRepo.removeItem(input.docId, input.itemId);
    return { ok: true };
  }
}
