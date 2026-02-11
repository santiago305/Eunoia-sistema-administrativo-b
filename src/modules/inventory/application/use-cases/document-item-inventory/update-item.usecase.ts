import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { UpdateItemInput } from '../../dto/document-item/input/item-update';
import { ItemOutput } from '../../dto/document-item/output/item-out';
import { InventoryRulesService } from '../../../domain/services/inventory-rules.service';
import { DocType } from '../../../domain/value-objects/doc-type';

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
      throw new BadRequestException('Documento no encontrado');
    }
    if (!doc.isDraft()) {
      throw new BadRequestException('Solo se puede editar items en DRAFT');
    }

    let quantity: number | undefined;

    if (doc.docType === DocType.CYCLE_COUNT) {
      if (input.quantity === undefined || input.quantity === null) {
        throw new BadRequestException('quantity es obligatorio para CYCLE_COUNT');
      }
      if (!Number.isInteger(input.quantity) || input.quantity < 0) {
        throw new BadRequestException('quantity invalido para CYCLE_COUNT');
      }
      quantity = input.quantity;
    } else {
      if (input.quantity === undefined || input.quantity === null) {
        throw new BadRequestException('quantity es obligatorio');
      }

      const allowNegative = doc.docType === DocType.ADJUSTMENT;
      try {
        quantity = await this.rules.normalizeQuantity({
          quantity: input.quantity,
          allowNegative,
        });
      } catch (error: any) {
        throw new BadRequestException(error?.message ?? 'Cantidad invalida');
      }
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
      throw new BadRequestException('Item no encontrado');
    }

    return {
      id: updated.id!,
      docId: updated.docId,
      variantId: updated.variantId,
      quantity: updated.quantity,
      unitCost: updated.unitCost ?? null,
    };
  }
}
