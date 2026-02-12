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

export class PostDocumentoIn {
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

      if (!doc.toWarehouseId) {
        throw new BadRequestException("IN requiere un almacen");
      }
      
      if(doc.docType != DocType.IN){
        throw new BadRequestException("El tipo de documento no es el adecuado");
      }

      // lock de snapshots que vamos a tocar
      const keys = items.map((i) => ({
        warehouseId: doc.toWarehouseId!,
        variantId: i.variantId,
        locationId: i.toLocationId
      }));
      
      await this.lock.lockSnapshots(keys, tx);

      const now = this.clock.now();
      const entries: LedgerEntry[] = [];

      for (const item of items) {
        const warehouseId = doc.toWarehouseId!;

        entries.push(
          new LedgerEntry(
            undefined,
            doc.id!,
            warehouseId,
            item.variantId,
            Direction.IN,
            item.quantity,
            item.unitCost ?? null,
            item.toLocationId,
            now,
          ),
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId,
            variantId: item.variantId,
            locationId: item.toLocationId,
            delta: item.quantity,
          },
          tx,
        );
      }

      if (entries.length > 0) {
        await this.ledgerRepo.append(entries, tx);
      }

      await this.documentRepo.markPosted(
        { docId: doc.id!, postedBy: input.postedBy, note:input.note , postedAt: now },
        tx,
      );

      return { status: '¡Postedo con exito!' };
    });
  }
}
