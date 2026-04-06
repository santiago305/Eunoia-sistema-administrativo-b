import { Inject, Injectable } from '@nestjs/common';
import { ListDocumentItemsInput } from '../../dto/document-item/input/get-items-by-id-document';
import { ItemOutput } from '../../dto/document-item/output/item-out';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../ports/document.repository.port';
import { DocumentOutputMapper } from '../../mappers/document-output.mapper';

@Injectable()
export class ListDocumentItemsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
  ) {}

  async execute(input: ListDocumentItemsInput): Promise<ItemOutput[]> {
    const items = await this.documentRepo.listItems(input.docId);
    return items.map((item) => DocumentOutputMapper.toItemOutput(item));
  }
}
