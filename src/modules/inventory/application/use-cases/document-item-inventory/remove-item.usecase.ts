import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { RemoveItemInput } from '../../dto/document-item/output/item-remove';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../ports/document.repository.port';
import { DocumentItemNotFoundApplicationError } from '../../errors/document-item-not-found.error';
import { DocumentNotFoundApplicationError } from '../../errors/document-not-found.error';

@Injectable()
export class RemoveItemUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
  ) {}

  async execute(input: RemoveItemInput): Promise<{ status: string }> {
    const doc = await this.documentRepo.findById(input.docId);
    if (!doc) {
      throw new NotFoundException(new DocumentNotFoundApplicationError().message);
    }
    if (!doc.isDraft()) {
      throw new BadRequestException('Solo se puede eliminar items en DRAFT');
    }

    const removed = await this.documentRepo.removeItem(input.docId, input.itemId);
    if (!removed) {
      throw new NotFoundException(new DocumentItemNotFoundApplicationError().message);
    }

    return { status: 'Item eliminado con exito' };
  }
}
