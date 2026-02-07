import { Inject, Injectable } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { ListDocumentItemsInput } from '../../dto/inputs';
import { ItemOutput } from '../../dto/outputs';

@Injectable()
export class ListDocumentItemsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
  ) {}

  async execute(input: ListDocumentItemsInput): Promise<ItemOutput[]> {
    const items = await this.documentRepo.listItems(input.docId);
    return items.map((i) => ({
      id: i.id!,
      docId: i.docId,
      variantId: i.variantId,
      quantity: i.quantity,
      unitCost: i.unitCost ?? null,
    }));
  }
}
