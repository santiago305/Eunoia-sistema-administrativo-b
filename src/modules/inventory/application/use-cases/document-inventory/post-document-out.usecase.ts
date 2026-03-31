import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PostDocumentInput } from "../../dto/document/input/document-post";
import { LedgerEntry } from "src/modules/inventory/domain/entities/ledger-entry";
import { Direction } from "src/modules/inventory/domain/value-objects/direction";
import { DocumentPostOutValidationService } from "src/modules/inventory/domain/services/document-post-out-validation.service";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { CLOCK, ClockPort } from "../../ports/clock.port";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "../../ports/document.repository.port";
import { INVENTORY_LOCK, InventoryLock } from "../../ports/inventory-lock.port";
import { INVENTORY_REPOSITORY, InventoryRepository } from "../../ports/inventory.repository.port";
import { LEDGER_REPOSITORY, LedgerRepository } from "../../ports/ledger.repository.port";

@Injectable()
export class PostDocumentoOut {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    private readonly outValidator: DocumentPostOutValidationService,
    @Inject(INVENTORY_LOCK)
    private readonly lock: InventoryLock,
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

      if (!doc.fromWarehouseId) {
        throw new BadRequestException("OUT requiere warehouseId");
      }
      
      if(doc.docType != DocType.OUT){
        throw new BadRequestException("El tipo de documento no es el adecuado");
      }
      const keys = items.map((i) => ({
        warehouseId: doc.fromWarehouseId!,
        stockItemId: i.stockItemId,
        locationId: i.fromLocationId
      }));

      await this.lock.lockSnapshots(keys, tx);

      const { insuficientes, suficientes } = await this.outValidator.validateOutStock(
        items,
        doc.fromWarehouseId!,
        tx,
      );

      if (insuficientes.length > 0) {
        throw new BadRequestException({
          message: {
            insuficientes,
            suficientes,
          },
        });
      }

      const now = this.clock.now();
      const entries: LedgerEntry[] = [];

      for (const item of items) {
        const warehouseId = doc.fromWarehouseId!;

        entries.push(
          new LedgerEntry(
            undefined,
            doc.id!,
            warehouseId,
            item.stockItemId,
            Direction.OUT,
            item.quantity,
            item.unitCost ?? null,
            item.id,
            item.wasteQty ?? 0,
            item.fromLocationId,
            now,
          ),
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId,
            stockItemId: item.stockItemId,
            locationId:item.fromLocationId,
            delta: -item.quantity,
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

