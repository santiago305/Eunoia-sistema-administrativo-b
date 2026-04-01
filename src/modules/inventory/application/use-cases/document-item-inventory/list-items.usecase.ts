import { Inject, Injectable } from '@nestjs/common';
import { ListDocumentItemsInput } from '../../dto/document-item/input/get-items-by-id-document';
import { ItemOutput } from '../../dto/document-item/output/item-out';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../ports/document.repository.port';

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
      stockItemId: i.stockItemId,
      quantity: i.quantity,
      wasteQty: i.wasteQty ?? 0,
      unitCost: i.unitCost ?? null,
      fromLocationId: i.fromLocationId, 
      toLocationId: i.toLocationId,    
    }));
  }
}

