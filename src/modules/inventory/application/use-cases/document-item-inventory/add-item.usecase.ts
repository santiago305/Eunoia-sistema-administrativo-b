import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { AddItemInput } from '../../dto/document-item/input/add-item';
import { ItemOutput } from '../../dto/document-item/output/item-out';
import InventoryDocumentItem from '../../../domain/entities/inventory-document-item';
import { InventoryRulesService } from '../../../domain/services/inventory-rules.service';
import { DocType } from '../../../domain/value-objects/doc-type';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../ports/document.repository.port';

@Injectable()
export class AddItemUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    private readonly rules: InventoryRulesService,
  ) {}

  async execute(input: AddItemInput): Promise<ItemOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const doc = await this.documentRepo.findById(input.docId, tx);
      if (!doc) {
        throw new BadRequestException('Documento no encontrado');
      }
      if (!doc.isDraft()) {
        throw new BadRequestException('Solo se puede agregar items a documentos en DRAFT');
      }

      let item: InventoryDocumentItem;

      if (input.quantity === undefined || input.quantity === null) {
        throw new BadRequestException('quantity es obligatorio');
      }

      const allowNegative = doc.docType === DocType.ADJUSTMENT;
      let normalizedQty: number;
      try {
        normalizedQty = await this.rules.normalizeQuantity({
          quantity: input.quantity,
          allowNegative,
        });
      } catch (error: any) {
        throw new BadRequestException(error?.message ?? 'Cantidad invalida');
      }

      item = new InventoryDocumentItem(
        undefined,
        input.docId,
        input.stockItemId,
        normalizedQty,
        0,
        input.fromLocationId,
        input.toLocationId,
        input.unitCost ?? null,
      );
      const saved = await this.documentRepo.addItem(item, tx);

      return {
        id: saved.id!,
        docId: saved.docId,
        stockItemId: saved.stockItemId,
        quantity: saved.quantity,
        wasteQty: saved.wasteQty ?? 0,
        unitCost: saved.unitCost ?? null,
        fromLocationId: saved.fromLocationId,
        toLocationId: saved.toLocationId,
      };
    });
  }
}

