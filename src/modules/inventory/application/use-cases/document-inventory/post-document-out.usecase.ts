import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { DOCUMENT_REPOSITORY, DocumentRepository } from "src/modules/inventory/domain/ports/document.repository.port";
import { INVENTORY_REPOSITORY, InventoryRepository } from "src/modules/inventory/domain/ports/inventory.repository.port";
import { BadRequestException, Inject } from "@nestjs/common";
import { PostDocumentInput } from "../../dto/inputs";
import { LedgerEntry } from "src/modules/inventory/domain/entities/ledger-entry";
import { LEDGER_REPOSITORY, LedgerRepository } from "src/modules/inventory/domain/ports/ledger.repository.port";
import { Direction } from "src/modules/inventory/domain/value-objects/direction";
import { DocumentPostOutValidationService } from "src/modules/inventory/domain/services/document-post-out-validation.service";

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
  ) {}

  async execute(input: PostDocumentInput) {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.documentRepo.getByIdWithItems(input.docId, tx);

      if (!result) {
        throw new BadRequestException("Documento no encontrado");
      }

      const { doc, items } = result;

      if (!doc.isDraft()) {
        return { isPosted: true };
      }

      if (!items.length) {
        throw new BadRequestException("El documento no tiene items");
      }

      if (!doc.fromWarehouseId) {
        throw new BadRequestException("OUT requiere warehouseId");
      }

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
            item.variantId,
            Direction.OUT,
            item.quantity,
            item.unitCost ?? null,
            item.fromLocationId,
            now,
          ),
        );

        await this.inventoryRepo.incrementOnHand(
          {
            warehouseId,
            variantId: item.variantId,
            locationId: item.fromLocationId,
            delta: -item.quantity,
          },
          tx,
        );
      }

      if (entries.length > 0) {
        await this.ledgerRepo.append(entries, tx);
      }

      await this.documentRepo.markPosted(
        { docId: doc.id!, postedBy: input.postedBy, postedAt: now },
        tx,
      );

      return { ok: true };
    });
  }
}
