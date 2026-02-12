import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { AddItemInput } from '../../dto/document-item/input/add-item';
import { ItemOutput } from '../../dto/document-item/output/item-out';
import InventoryDocumentItem from '../../../domain/entities/inventory-document-item';
import { InventoryRulesService } from '../../../domain/services/inventory-rules.service';
import { DocType } from '../../../domain/value-objects/doc-type';

@Injectable()
export class AddItemUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    private readonly rules: InventoryRulesService,
  ) {}

  async execute(input: AddItemInput): Promise<ItemOutput> {
    const doc = await this.documentRepo.findById(input.docId);
    if (!doc) {
      throw new BadRequestException('Documento no encontrado');
    }
    if (!doc.isDraft()) {
      throw new BadRequestException('Solo se puede agregar items a documentos en DRAFT');
    }

    let item: InventoryDocumentItem;

    //DESABILITE LA LOGICA DE CYCLE_COUNT, PORQUE NO ESTOY SEGURO DE QUE SEA UTIL TENER ESE METODO
    // if (doc.docType === DocType.CYCLE_COUNT) {
    //   if (input.quantity === undefined || input.quantity === null) {
    //     throw new BadRequestException('quantity es obligatorio para CYCLE_COUNT');
    //   }
    //   if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    //     throw new BadRequestException('quantity invalido para CYCLE_COUNT');
    //   }

    //   item = new InventoryDocumentItem(
    //     undefined,
    //     input.docId,
    //     input.variantId,
    //     input.quantity,
    //     input.fromLocationId,
    //     input.toLocationId,
    //     input.unitCost ?? null,
    //   );
    // } else {

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
      input.variantId,
      normalizedQty,
      input.fromLocationId,
      input.toLocationId,
      input.unitCost ?? null,
    );
    const saved = await this.documentRepo.addItem(item);

    return {
      id: saved.id!,
      docId: saved.docId,
      variantId: saved.variantId,
      quantity: saved.quantity,
      unitCost: saved.unitCost ?? null,
      fromLocationId: saved.fromLocationId, 
      toLocationId: saved.toLocationId,     
    };
  }
}
