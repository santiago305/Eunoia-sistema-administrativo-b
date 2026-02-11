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
import { DocumentPostOutValidationService } from "src/modules/inventory/domain/services/document-post-out-validation.service";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export class PostDocumentoTransfer {
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
    private readonly outValidator: DocumentPostOutValidationService,
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

      if (!doc.fromWarehouseId || !doc.toWarehouseId) {
        throw new BadRequestException("TRANSFER requiere almacén origen y destino");
      }

      if (doc.fromWarehouseId === doc.toWarehouseId) {
        throw new BadRequestException("TRANSFER requiere almacenes distintos");
      }
      if(doc.docType != DocType.TRANSFER){
        throw new BadRequestException("El tipo del documento no es el adecuado");
      }

      // validar stock en origen usando el servicio
      const { insuficientes } = await this.outValidator.validateOutStock(
        items,
        doc.fromWarehouseId!,
        tx,
      );

      if (insuficientes.length > 0) {
        throw new BadRequestException({
          message: { insuficientes },
        });
      }

      // lock adicional en destino para evitar carreras al ingresar
      const keys = items.map((i) => ({
        warehouseId: doc.toWarehouseId!,
        variantId: i.variantId,
      }));
      
      await this.lock.lockSnapshots(keys, tx);

      const now = this.clock.now();
      const entries: LedgerEntry[] = [];

      for (const item of items) {
        const fromWarehouseId = doc.fromWarehouseId!;
        const toWarehouseId = doc.toWarehouseId!;

        // OUT
        entries.push(
          new LedgerEntry(
            undefined,
            doc.id!,
            fromWarehouseId,
            item.variantId,
            Direction.OUT,
            item.quantity,
            item.unitCost ?? null,
            item.fromLocationId,
            now,
          ),
        );
        // IN
        entries.push(
          new LedgerEntry(
            undefined,
            doc.id!,
            toWarehouseId,
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
            warehouseId: fromWarehouseId,
            variantId: item.variantId,
            delta: -item.quantity,
          },
          tx,
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId: toWarehouseId,
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
