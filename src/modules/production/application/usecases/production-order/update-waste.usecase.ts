import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { UpdateProductionWasteInput } from "../../dto/production-order/input/update-production-waste";
import { ReferenceType } from "src/modules/inventory/domain/value-objects/reference-type";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/inventory/application/ports/document.repository.port";
import { LEDGER_REPOSITORY, LedgerRepository } from "src/modules/inventory/application/ports/ledger.repository.port";
import { WastedQuantityError } from "src/modules/production/domain/value-objects/wate-quantity.error.vo";
import { DomainError } from "src/modules/production/domain/errors/domain.error";

@Injectable()
export class UpdateProductionWaste {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
  ) {}

  async execute(input: UpdateProductionWasteInput): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.orderRepo.findById(input.productionId, tx);
      if (!order) {
        throw new NotFoundException(errorResponse("Orden de produccion no encontrada"));
      }

      if (!input.items || input.items.length === 0) {
        throw new BadRequestException(errorResponse("Items de merma son obligatorios"));
      }

      const docs = await this.documentRepo.findByReference(
        {
          referenceType: ReferenceType.PRODUCTION,
          referenceId: input.productionId,
          docType: DocType.OUT,
        },
        tx,
      );

      if (!docs.length) {
        throw new NotFoundException(errorResponse("Documento OUT de produccion no encontrado"));
      }

      const outDoc = docs[0];
      if (outDoc.status !== DocStatus.POSTED) {
        throw new BadRequestException(errorResponse("El documento OUT aun no esta posteado"));
      }

      const docItems = await this.documentRepo.listItems(outDoc.id!, tx);
      const byKey = new Map<string, typeof docItems[number]>();
      for (const i of docItems) {
        const key = `${i.stockItemId}::${i.fromLocationId ?? "null"}`;
        if (byKey.has(key)) {
          throw new BadRequestException(errorResponse("Items duplicados en el documento de consumo"));
        }
        byKey.set(key, i);
      }

      for (const item of input.items) {
        const key = `${item.stockItemId}::${item.locationId ?? "null"}`;
        const docItem = byKey.get(key);
        if (!docItem) {
          throw new BadRequestException(errorResponse("Item de consumo no encontrado para actualizar merma"));
        }
        try {
          WastedQuantityError.create(item.wasteQty);
        } catch (err) {
          if (err instanceof DomainError) {
            throw new BadRequestException(errorResponse(err.message));
          }
          throw err;
        }
        if (item.wasteQty > docItem.quantity) {
          throw new BadRequestException(errorResponse("Merma no puede ser mayor a la cantidad del item"));
        }

        await this.documentRepo.updateItem(
          {
            docId: outDoc.id!,
            itemId: docItem.id!,
            wasteQty: item.wasteQty,
          },
          tx,
        );

        const updatedLedger = await this.ledgerRepo.updateWasteByDocItem(
          { docItemId: docItem.id!, wasteQty: item.wasteQty },
          tx,
        );
        if (!updatedLedger) {
          throw new BadRequestException(errorResponse("No se pudo actualizar merma en el kardex"));
        }

        if (item.itemId) {
          const updated = await this.orderRepo.updateItem(
            {
              productionId: input.productionId,
              itemId: item.itemId,
              wasteQty: item.wasteQty,
            },
            tx,
          );
          if (!updated) {
            throw new BadRequestException(errorResponse("ProductionItem no encontrado para actualizar merma"));
          }
        }
      }

      return successResponse("Merma actualizada");
    });
  }
}
