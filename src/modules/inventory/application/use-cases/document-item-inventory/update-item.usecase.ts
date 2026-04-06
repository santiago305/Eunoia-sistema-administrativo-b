import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateItemInput } from '../../dto/document-item/input/item-update';
import { ItemOutput } from '../../dto/document-item/output/item-out';
import { InventoryRulesService } from '../../../domain/services/inventory-rules.service';
import { DocType } from '../../../domain/value-objects/doc-type';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../ports/document.repository.port';
import { DocumentOutputMapper } from '../../mappers/document-output.mapper';
import { DocumentItemNotFoundApplicationError } from '../../errors/document-item-not-found.error';
import { DocumentNotFoundApplicationError } from '../../errors/document-not-found.error';

@Injectable()
export class UpdateItemUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    private readonly rules: InventoryRulesService,
  ) {}

  async execute(input: UpdateItemInput): Promise<ItemOutput> {
    const doc = await this.documentRepo.findById(input.docId);
    if (!doc) {
      throw new NotFoundException(new DocumentNotFoundApplicationError().message);
    }
    if (!doc.isDraft()) {
      throw new BadRequestException('Solo se puede editar items en DRAFT');
    }
    if (input.quantity === undefined || input.quantity === null) {
      throw new BadRequestException('quantity es obligatorio');
    }

    const allowNegative = doc.docType === DocType.ADJUSTMENT;
    let quantity: number;
    try {
      quantity = await this.rules.normalizeQuantity({
        quantity: input.quantity,
        allowNegative,
      });
    } catch (error: any) {
      throw new BadRequestException(error?.message ?? 'Cantidad invalida');
    }

    const updated = await this.documentRepo.updateItem(
      {
        docId: input.docId,
        itemId: input.itemId,
        quantity,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        unitCost: input.unitCost ?? null,
      },
      undefined,
    );

    if (!updated) {
      throw new NotFoundException(new DocumentItemNotFoundApplicationError().message);
    }

    return DocumentOutputMapper.toItemOutput(updated);
  }
}
