import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/inventory/domain/ports/inventory-lock.port";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/inventory/domain/ports/document.repository.port";
import { INVENTORY_REPOSITORY, InventoryRepository } from "src/modules/inventory/domain/ports/inventory.repository.port";
import { BadRequestException, Inject } from "@nestjs/common";
import { PostDocumentInput } from "../../dto/document/input/document-post";
import { LedgerEntry } from "src/modules/inventory/domain/entities/ledger-entry";
import { LEDGER_REPOSITORY, LedgerRepository } from "src/modules/inventory/domain/ports/ledger.repository.port";
import { Direction } from "src/modules/inventory/domain/value-objects/direction";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

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

  async execute(input: PostDocumentInput) {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.documentRepo.getByIdWithItems(input.docId, tx);

      if (!result) {
        throw new BadRequestException("Documento no encontrado");
      }

      const { doc, items } = result;

      if (!doc.isDraft()) {
        throw new BadRequestException('Documento ya ha sido posteado');
      }

      if (!items.length) {
        throw new BadRequestException("El documento no tiene items");
      }

      const warehouseId = doc.fromWarehouseId;
      if (!warehouseId) {
        throw new BadRequestException("ADJUSTMENT requiere un almacen");
      }
      
      if(doc.docType != DocType.ADJUSTMENT){
        throw new BadRequestException("El tipo del documento no es el adecuado");
      }

      const keys = items.map((i) => ({
        warehouseId,
        variantId: i.variantId,
      }));
      await this.lock.lockSnapshots(keys, tx);

      const now = this.clock.now();
      const entries: LedgerEntry[] = [];

      for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity === 0) {
          throw new BadRequestException("Cantidad invalida para ADJUSTMENT");
        }

        // si es ajuste negativo, validar stock
        if (item.quantity < 0) {
          const snapshot = await this.inventoryRepo.getSnapshot(
            {
              warehouseId,
              variantId: item.variantId,
            },
            tx,
          );

          const onHand = snapshot?.onHand ?? 0;
          const reserved = snapshot?.reserved ?? 0;
          const available = onHand - reserved;

          if (available < Math.abs(item.quantity)) {
            throw new BadRequestException("Stock insuficiente");
          }
        }

        const direction = item.quantity > 0 ? Direction.IN : Direction.OUT;
        const qty = Math.abs(item.quantity);

        entries.push(
          new LedgerEntry(
            undefined,
            doc.id!,
            warehouseId,
            item.variantId,
            direction,
            qty,
            item.unitCost ?? null,
            item.fromLocationId,
            now,
          ),
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId,
            variantId: item.variantId,
            delta: item.quantity,
          },
          tx,
        );
      }

      if (entries.length > 0) {
        await this.ledgerRepo.append(entries, tx);
      }

      await this.documentRepo.markPosted(
        { docId: doc.id!, postedBy: input.postedBy, note: input.note , postedAt: now },
        tx,
      );

      return { status: '¡Postedo con exito!' };
    });
  }
}
