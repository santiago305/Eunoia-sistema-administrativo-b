import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseReception } from "../../domain/entity/purchase-reception";
import { PurchaseReceptionItem } from "../../domain/entity/purchase-reception-item";
import {
  PURCHASE_RECEPTION_REPOSITORY,
  PurchaseReceptionRepository,
} from "../../domain/ports/purchase-reception.repository";
import { PurchaseReceptionOutput } from "../dtos/purchase-reception.output";
import { PurchaseReceptionOutputMapper } from "../mappers/purchase-reception-output.mapper";

export type CreatePurchaseReceptionInput = {
  purchaseId: string;
  warehouseId?: string;
  note?: string;
  evidenceUrls?: string[];
  items: Array<{
    purchaseItemId: string;
    receivedQuantity: number;
    acceptedQuantity?: number;
    rejectedQuantity?: number;
    note?: string;
  }>;
};

@Injectable()
export class CreatePurchaseReceptionUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly purchaseItemRepo: PurchaseOrderItemRepository,
    @Inject(PURCHASE_RECEPTION_REPOSITORY)
    private readonly receptionRepo: PurchaseReceptionRepository,
  ) {}

  async execute(input: CreatePurchaseReceptionInput, userId?: string): Promise<PurchaseReceptionOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const purchase = await this.purchaseRepo.findById(input.purchaseId, tx);
      if (!purchase) throw new NotFoundException("Orden de compra no encontrada");
      if (purchase.receptionStatus === "RECEIVED") {
        throw new BadRequestException("La compra ya fue recibida completamente");
      }
      if (!input.items?.length) {
        throw new BadRequestException("Debes registrar al menos un item recibido");
      }

      const purchaseItems = await this.purchaseItemRepo.getByPurchaseId(
        purchase.poId,
        purchase.currency ?? CurrencyType.PEN,
        tx,
      );
      const itemMap = new Map(purchaseItems.map((item) => [item.poItemId, item]));
      const confirmedTotals = await this.receptionRepo.listConfirmedTotalsByPurchaseId(purchase.poId, tx);
      const totalsMap = new Map(confirmedTotals.map((row) => [row.purchaseItemId, row]));
      const seen = new Set<string>();

      const receptionItems = input.items.map((line) => {
        if (seen.has(line.purchaseItemId)) {
          throw new BadRequestException("No puedes repetir el mismo item en una recepción");
        }
        seen.add(line.purchaseItemId);

        const purchaseItem = itemMap.get(line.purchaseItemId);
        if (!purchaseItem) throw new BadRequestException("Item de compra no encontrado");

        const receivedQuantity = Number(line.receivedQuantity);
        const acceptedQuantity = Number(line.acceptedQuantity ?? receivedQuantity);
        const rejectedQuantity = Number(line.rejectedQuantity ?? Math.max(0, receivedQuantity - acceptedQuantity));
        if (![receivedQuantity, acceptedQuantity, rejectedQuantity].every((value) => Number.isFinite(value) && value >= 0)) {
          throw new BadRequestException("Las cantidades de recepción deben ser números positivos");
        }
        if (receivedQuantity <= 0) {
          throw new BadRequestException("La cantidad recibida debe ser mayor a cero");
        }
        if (acceptedQuantity + rejectedQuantity > receivedQuantity) {
          throw new BadRequestException("La cantidad aceptada y rechazada no puede superar lo recibido");
        }

        const previousReceived = totalsMap.get(line.purchaseItemId)?.receivedQuantity ?? 0;
        if (previousReceived + receivedQuantity > purchaseItem.quantity) {
          throw new BadRequestException("La recepción supera la cantidad pendiente del item");
        }

        return new PurchaseReceptionItem(
          undefined,
          "",
          purchaseItem.poItemId,
          purchaseItem.stockItemId,
          purchaseItem.itemType,
          purchaseItem.quantity,
          receivedQuantity,
          acceptedQuantity,
          rejectedQuantity,
          purchaseItem.affectsStock,
          false,
          false,
          line.note?.trim() || undefined,
        );
      });

      const row = await this.receptionRepo.create(
        new PurchaseReception(
          undefined,
          purchase.poId,
          input.warehouseId ?? purchase.warehouseId,
          "DRAFT",
          undefined,
          undefined,
          input.note?.trim() || undefined,
          input.evidenceUrls ?? [],
        ),
        receptionItems,
        tx,
      );

      await this.manager(tx).getRepository(PurchaseHistoryEventEntity).save({
        purchaseId: purchase.poId,
        eventType: "PURCHASE_RECEPTION_CREATED",
        description: "Se registró una recepción de compra.",
        performedByUserId: userId ?? null,
        metadata: {
          receptionId: row.reception.receptionId,
          items: row.items.map((item) => ({
            purchaseItemId: item.purchaseItemId,
            receivedQuantity: item.receivedQuantity,
            acceptedQuantity: item.acceptedQuantity,
            rejectedQuantity: item.rejectedQuantity,
            affectsStock: item.affectsStock,
          })),
        },
      });

      return PurchaseReceptionOutputMapper.toOutput(row);
    });
  }

  private manager(tx: TransactionContext): EntityManager {
    return (tx as TypeormTransactionContext).manager;
  }
}
