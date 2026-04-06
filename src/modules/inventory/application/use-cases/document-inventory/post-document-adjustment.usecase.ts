import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { LedgerEntry } from "src/modules/inventory/domain/entities/ledger-entry";
import { Direction } from "src/modules/inventory/domain/value-objects/direction";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PostDocumentInput } from "../../dto/document/input/document-post";
import { DocumentNotFoundApplicationError } from "../../errors/document-not-found.error";
import { CLOCK, ClockPort } from "../../ports/clock.port";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "../../ports/document.repository.port";
import { INVENTORY_LOCK, InventoryLock } from "../../ports/inventory-lock.port";
import { INVENTORY_REPOSITORY, InventoryRepository } from "../../ports/inventory.repository.port";
import { LEDGER_REPOSITORY, LedgerRepository } from "../../ports/ledger.repository.port";

@Injectable()
export class PostDocumentoAdjustment {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    @Inject(INVENTORY_LOCK)
    private readonly lock: InventoryLock,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
  ) {}

  async execute(input: PostDocumentInput): Promise<{ status: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.documentRepo.getByIdWithItems(input.docId, tx);

      if (!result) {
        throw new NotFoundException(new DocumentNotFoundApplicationError().message);
      }

      const { doc, items } = result;

      if (!doc.isDraft()) {
        throw new BadRequestException("Documento ya ha sido posteado");
      }

      if (!items.length) {
        throw new BadRequestException("El documento no tiene items");
      }

      if (!doc.fromWarehouseId) {
        throw new BadRequestException("ADJUSTMENT requiere un almacen");
      }

      if (doc.docType !== DocType.ADJUSTMENT) {
        throw new BadRequestException("El tipo del documento no es el adecuado");
      }

      await this.lock.lockSnapshots(
        items.map((item) => ({
          warehouseId: doc.fromWarehouseId!,
          stockItemId: item.stockItemId,
          locationId: item.fromLocationId,
        })),
        tx,
      );

      const now = this.clock.now();
      const entries: LedgerEntry[] = [];

      for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity === 0) {
          throw new BadRequestException("Cantidad invalida para ADJUSTMENT");
        }

        if (item.quantity < 0) {
          const snapshot = await this.inventoryRepo.getSnapshot(
            {
              warehouseId: doc.fromWarehouseId!,
              stockItemId: item.stockItemId,
              locationId: item.fromLocationId,
            },
            tx,
          );

          const available = (snapshot?.onHand ?? 0) - (snapshot?.reserved ?? 0);
          if (available < Math.abs(item.quantity)) {
            throw new BadRequestException("Stock insuficiente");
          }
        }

        const direction = item.quantity > 0 ? Direction.IN : Direction.OUT;
        const quantity = Math.abs(item.quantity);

        entries.push(
          new LedgerEntry(
            undefined,
            doc.id!,
            doc.fromWarehouseId!,
            item.stockItemId,
            direction,
            quantity,
            item.unitCost ?? null,
            item.id,
            item.wasteQty ?? 0,
            item.fromLocationId,
            now,
          ),
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId: doc.fromWarehouseId!,
            stockItemId: item.stockItemId,
            locationId: item.fromLocationId,
            delta: item.quantity,
          },
          tx,
        );
      }

      if (entries.length > 0) {
        await this.ledgerRepo.append(entries, tx);
      }

      await this.documentRepo.markPosted(
        { docId: doc.id!, postedBy: input.postedBy, note: input.note, postedAt: now },
        tx,
      );

      return { status: "Documento posteado con exito" };
    });
  }
}
