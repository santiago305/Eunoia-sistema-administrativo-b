import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepository } from '../../../domain/ports/document.repository.port';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../../domain/ports/inventory.repository.port';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../../domain/ports/ledger.repository.port';
import { UNIT_OF_WORK, UnitOfWork } from '../../../domain/ports/unit-of-work.port';
import { INVENTORY_LOCK, InventoryLock } from '../../../domain/ports/inventory-lock.port';
import { CLOCK, ClockPort } from '../../../domain/ports/clock.port';
import { PostDocumentInput } from '../../dto/inputs';
import { Direction } from '../../../domain/value-objects/direction';
import { LedgerEntry } from '../../../domain/entities/ledger-entry';
import { DocType } from '../../../domain/value-objects/doc-type';
import { Inventory } from '../../../domain/entities/inventory';
import InventoryDocumentItem from '../../../domain/entities/inventory-document-item';

@Injectable()
export class PostDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(INVENTORY_LOCK)
    private readonly lock: InventoryLock,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: PostDocumentInput) {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.documentRepo.getByIdWithItems(input.docId, tx);
      if (!result) {
        throw new BadRequestException('Documento no encontrado');
      }

      const { doc, items } = result;

      if (!doc.isDraft()) {
        return { ok: true };
      }

      if (!items.length) {
        throw new BadRequestException('El documento no tiene items');
      }

      if (doc.docType === DocType.TRANSFER) {
        if (!doc.fromWarehouseId || !doc.toWarehouseId) {
          throw new BadRequestException('TRANSFER requiere almacenes origen y destino');
        }
        if (doc.fromWarehouseId === doc.toWarehouseId) {
          throw new BadRequestException('TRANSFER requiere almacenes distintos');
        }
      }

      const keys = this.buildKeys(doc.docType, doc.fromWarehouseId, doc.toWarehouseId, items);
      await this.lock.lockSnapshots(keys, tx);

      const snapshots = await this.inventoryRepo.findByKeys(keys, tx);
      const snapshotMap = new Map<string, Inventory>();
      for (const s of snapshots) {
        snapshotMap.set(this.keyOf(s.warehouseId, s.variantId, s.locationId), s);
      }

      const now = this.clock.now();
      const entries: LedgerEntry[] = [];

      for (const item of items) {
        if (doc.docType === DocType.TRANSFER) {
          const fromWarehouseId = doc.fromWarehouseId!;
          const toWarehouseId = doc.toWarehouseId!;

          const fromSnapshot = this.getSnapshot(snapshotMap, fromWarehouseId, item.variantId, item.fromLocationId);
          this.ensureAvailable(fromSnapshot, item.quantity);

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
              locationId: item.fromLocationId,
              variantId: item.variantId,
              delta: -item.quantity,
            },
            tx,
          );

          await this.inventoryRepo.incrementOnHand(
            {
              warehouseId: toWarehouseId,
              locationId: item.toLocationId,
              variantId: item.variantId,
              delta: item.quantity,
            },
            tx,
          );

          continue;
        }

        if (doc.docType === DocType.ADJUSTMENT) {
          const warehouseId = doc.toWarehouseId ?? doc.fromWarehouseId;
          if (!warehouseId) {
            throw new BadRequestException('ADJUSTMENT requiere warehouseId');
          }

          if (!Number.isInteger(item.quantity) || item.quantity === 0) {
            throw new BadRequestException('Cantidad invalida para ADJUSTMENT');
          }

          const snapshot = this.getSnapshot(
            snapshotMap,
            warehouseId,
            item.variantId,
            item.toLocationId ?? item.fromLocationId,
          );
          if (item.quantity < 0) {
            this.ensureAvailable(snapshot, Math.abs(item.quantity));
          }

          const direction = item.quantity >= 0 ? Direction.IN : Direction.OUT;
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
              item.toLocationId ?? item.fromLocationId,
              now,
            ),
          );

          await this.inventoryRepo.incrementOnHand(
            {
              warehouseId,
              locationId: item.toLocationId ?? item.fromLocationId,
              variantId: item.variantId,
              delta: item.quantity,
            },
            tx,
          );

          continue;
        }

        if (doc.docType === DocType.CYCLE_COUNT) {
          const warehouseId = doc.toWarehouseId ?? doc.fromWarehouseId;
          if (!warehouseId) {
            throw new BadRequestException('CYCLE_COUNT requiere warehouseId');
          }

          if (!Number.isInteger(item.quantity) || item.quantity < 0) {
            throw new BadRequestException('quantity invalido para CYCLE_COUNT');
          }

          const snapshot = this.getSnapshot(
            snapshotMap,
            warehouseId,
            item.variantId,
            item.toLocationId ?? item.fromLocationId,
          );
          const diff = item.quantity - snapshot.onHand;

          if (diff === 0) {
            continue;
          }

          if (diff < 0) {
            this.ensureAvailable(snapshot, Math.abs(diff));
          }

          const direction = diff > 0 ? Direction.IN : Direction.OUT;
          const qty = Math.abs(diff);

          entries.push(
            new LedgerEntry(
              undefined,
              doc.id!,
              warehouseId,
              item.variantId,
              direction,
              qty,
              item.unitCost ?? null,
              item.toLocationId ?? item.fromLocationId,
              now,
            ),
          );

          await this.inventoryRepo.incrementOnHand(
            {
              warehouseId,
              locationId: item.toLocationId ?? item.fromLocationId,
              variantId: item.variantId,
              delta: diff,
            },
            tx,
          );

          continue;
        }

        if (doc.docType === DocType.IN) {
          const warehouseId = doc.toWarehouseId ?? doc.fromWarehouseId;
          if (!warehouseId) {
            throw new BadRequestException('IN requiere warehouseId');
          }

          entries.push(
            new LedgerEntry(
              undefined,
              doc.id!,
              warehouseId,
              item.variantId,
              Direction.IN,
              item.quantity,
              item.unitCost ?? null,
              item.toLocationId ?? item.fromLocationId,
              now,
            ),
          );

          await this.inventoryRepo.incrementOnHand(
            {
              warehouseId,
              locationId: item.toLocationId ?? item.fromLocationId,
              variantId: item.variantId,
              delta: item.quantity,
            },
            tx,
          );

          continue;
        }

        if (doc.docType === DocType.OUT) {
          const warehouseId = doc.fromWarehouseId;
          if (!warehouseId) {
            throw new BadRequestException('OUT requiere warehouseId');
          }

          const snapshot = this.getSnapshot(snapshotMap, warehouseId, item.variantId, item.fromLocationId);
          this.ensureAvailable(snapshot, item.quantity);

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
              locationId: item.fromLocationId,
              variantId: item.variantId,
              delta: -item.quantity,
            },
            tx,
          );

          continue;
        }

        throw new BadRequestException('Tipo de documento no soportado');
      }

      if (entries.length > 0) {
        await this.ledgerRepo.append(entries, tx);
      }

      await this.documentRepo.markPosted(
        {
          docId: doc.id!,
          postedBy: input.postedBy,
          postedAt: now,
        },
        tx,
      );

      return { ok: true };
    });
  }

  private ensureAvailable(snapshot: Inventory, qty: number) {
    const available = snapshot.onHand - snapshot.reserved;
    if (available < qty) {
      throw new BadRequestException('Stock insuficiente');
    }
  }

  private keyOf(warehouseId: string, variantId: string, locationId?: string) {
    return `${warehouseId}::${variantId}::${locationId ?? 'null'}`;
  }

  private getSnapshot(
    map: Map<string, Inventory>,
    warehouseId: string,
    variantId: string,
    locationId?: string,
  ): Inventory {
    const key = this.keyOf(warehouseId, variantId, locationId);
    const existing = map.get(key);
    if (existing) return existing;

    return new Inventory(warehouseId, variantId, 0, 0, 0, locationId);
  }

  private buildKeys(
    docType: DocType,
    fromWarehouseId: string | undefined,
    toWarehouseId: string | undefined,
    items: InventoryDocumentItem[],
  ): Array<{ warehouseId: string; variantId: string; locationId?: string }> {
    const keys: Array<{ warehouseId: string; variantId: string; locationId?: string }> = [];
    const addKey = (warehouseId: string, variantId: string, locationId?: string) => {
      const key = this.keyOf(warehouseId, variantId, locationId);
      if (!keys.find((k) => this.keyOf(k.warehouseId, k.variantId, k.locationId) === key)) {
        keys.push({ warehouseId, variantId, locationId });
      }
    };

    for (const item of items) {
      if (docType === DocType.TRANSFER) {
        if (fromWarehouseId) {
          addKey(fromWarehouseId, item.variantId, item.fromLocationId);
        }
        if (toWarehouseId) {
          addKey(toWarehouseId, item.variantId, item.toLocationId);
        }
        continue;
      }

      const warehouseId = toWarehouseId ?? fromWarehouseId;
      if (warehouseId) {
        addKey(warehouseId, item.variantId, item.toLocationId ?? item.fromLocationId);
      }
    }

    return keys;
  }
}
