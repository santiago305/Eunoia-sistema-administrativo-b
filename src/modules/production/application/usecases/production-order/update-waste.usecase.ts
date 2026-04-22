import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/product-catalog/integration/inventory/ports/document.repository.port";
import { LEDGER_REPOSITORY, LedgerRepository } from "src/modules/product-catalog/integration/inventory/ports/ledger.repository.port";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { WastedQuantityError } from "src/modules/production/domain/value-objects/wate-quantity.error.vo";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { UpdateProductionWasteInput } from "../../dto/production-order/input/update-production-waste";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";

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

  async execute(input: UpdateProductionWasteInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.orderRepo.findById(input.productionId, tx);
      if (!order) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      if (!input.items?.length) {
        throw new BadRequestException("Items de merma son obligatorios");
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
        throw new NotFoundException("Documento OUT de produccion no encontrado");
      }

      const outDoc = docs[0];
      if (outDoc.status !== DocStatus.POSTED) {
        throw new BadRequestException("El documento OUT aun no esta posteado");
      }

      const docItems = await this.documentRepo.listItems(outDoc.id!, tx);
      const byKey = new Map<string, (typeof docItems)[number]>();

      for (const item of docItems) {
        const key = `${item.stockItemId}::${item.fromLocationId ?? "null"}`;
        if (byKey.has(key)) {
          throw new BadRequestException("Items duplicados en el documento de consumo");
        }
        byKey.set(key, item);
      }

      for (const item of input.items) {
        const key = `${item.stockItemId}::${item.locationId ?? "null"}`;
        const docItem = byKey.get(key);

        if (!docItem) {
          throw new BadRequestException("Item de consumo no encontrado para actualizar merma");
        }

        try {
          WastedQuantityError.create(item.wasteQty);
        } catch (err) {
          if (err instanceof DomainError) {
            throw new BadRequestException(err.message);
          }
          throw err;
        }

        if (item.wasteQty > docItem.quantity) {
          throw new BadRequestException("Merma no puede ser mayor a la cantidad del item");
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
          throw new BadRequestException("No se pudo actualizar merma en el kardex");
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
            throw new BadRequestException("ProductionItem no encontrado para actualizar merma");
          }
        }
      }

      return { message: "Merma actualizada con exito" };
    });
  }
}
