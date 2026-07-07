import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PostInventoryFromPurchaseUsecase } from "src/modules/purchases/application/usecases/purchase-order/Inventory-purchase.usecase";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { PurchaseItemType } from "src/modules/purchases/domain/value-objects/purchase-item-type";
import { ReceptionStatus } from "src/modules/purchases/domain/value-objects/reception-status";
import {
  PURCHASE_RECEPTION_REPOSITORY,
  PurchaseReceptionRepository,
} from "../../domain/ports/purchase-reception.repository";
import { PurchaseReceptionOutput } from "../dtos/purchase-reception.output";
import { PurchaseReceptionOutputMapper } from "../mappers/purchase-reception-output.mapper";

@Injectable()
export class ConfirmPurchaseReceptionUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly purchaseItemRepo: PurchaseOrderItemRepository,
    @Inject(PURCHASE_RECEPTION_REPOSITORY)
    private readonly receptionRepo: PurchaseReceptionRepository,
    private readonly inventoryPurchase: PostInventoryFromPurchaseUsecase,
    @Optional()
    private readonly history?: PurchaseHistoryService,
  ) {}

  async execute(receptionId: string, userId?: string): Promise<PurchaseReceptionOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const row = await this.receptionRepo.findById(receptionId, tx);
      if (!row) throw new NotFoundException("Recepción no encontrada");
      if (row.reception.status === "CONFIRMED") {
        throw new BadRequestException("La recepción ya fue confirmada");
      }

      const purchase = await this.purchaseRepo.findById(row.reception.purchaseId, tx);
      if (!purchase) throw new NotFoundException("Orden de compra no encontrada");
      if (purchase.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException("No puedes recibir una compra cancelada");
      }

      const purchaseItems = await this.purchaseItemRepo.getByPurchaseId(
        purchase.poId,
        purchase.currency ?? CurrencyType.PEN,
        tx,
      );
      const stockLines = row.items
        .filter((item) => item.affectsStock && item.stockItemId && item.acceptedQuantity > 0)
        .map((item) => ({
          purchaseItemId: item.purchaseItemId,
          quantity: item.acceptedQuantity,
        }));
      const serviceConfirmedItemIds = row.items
        .filter((item) =>
          !item.affectsStock ||
          item.itemType === PurchaseItemType.SERVICE ||
          item.itemType === PurchaseItemType.SUBSCRIPTION,
        )
        .map((item) => item.purchaseItemId);

      let inventoryDocumentId: string | undefined;
      if (stockLines.length) {
        if (!row.reception.warehouseId) {
          throw new BadRequestException("La recepción con stock requiere almacén destino");
        }
        const inventoryResult = await this.inventoryPurchase.execute({
          poId: purchase.poId,
          toWarehouseId: row.reception.warehouseId,
          postedBy: userId ?? purchase.createdBy,
          createdBy: userId ?? purchase.createdBy,
          note: row.reception.note ?? "Ingreso parcial por recepción de compra",
          items: stockLines,
          tx,
        });
        inventoryDocumentId = inventoryResult.docId;
      }

      await this.receptionRepo.confirm(
        receptionId,
        {
          receivedByUserId: userId,
          receivedAt: new Date(),
          inventoryDocumentId,
          stockPostedItemIds: stockLines.map((item) => item.purchaseItemId),
          serviceConfirmedItemIds,
        },
        tx,
      );

      const totals = await this.receptionRepo.listConfirmedTotalsByPurchaseId(purchase.poId, tx);
      const totalsMap = new Map(totals.map((item) => [item.purchaseItemId, item]));
      const hasAnyReceived = totals.some((item) => item.receivedQuantity > 0);
      const isFullyReceived = purchaseItems.every((item) => {
        const received = totalsMap.get(item.poItemId)?.receivedQuantity ?? 0;
        return received >= item.quantity;
      });
      const nextReceptionStatus = isFullyReceived
        ? ReceptionStatus.RECEIVED
        : hasAnyReceived
          ? ReceptionStatus.PARTIALLY_RECEIVED
          : ReceptionStatus.PENDING;
      const nextPurchaseStatus = isFullyReceived
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIAL;

      await this.purchaseRepo.update({
        poId: purchase.poId,
        receptionStatus: nextReceptionStatus,
        status: nextPurchaseStatus,
      }, tx);

      await this.history?.record({
        purchaseId: purchase.poId,
        eventType: isFullyReceived ? "PURCHASE_FULLY_RECEIVED" : "PURCHASE_PARTIALLY_RECEIVED",
        description: isFullyReceived
          ? "La compra fue recibida completamente."
          : "La compra fue recibida parcialmente.",
        performedByUserId: userId ?? null,
        metadata: {
          receptionId,
          receptionStatus: nextReceptionStatus,
          inventoryDocumentId: inventoryDocumentId ?? null,
          items: row.items.map((item) => ({
            purchaseItemId: item.purchaseItemId,
            receivedQuantity: item.receivedQuantity,
            acceptedQuantity: item.acceptedQuantity,
            rejectedQuantity: item.rejectedQuantity,
            affectsStock: item.affectsStock,
          })),
        },
      }, tx);

      if (inventoryDocumentId) {
        await this.history?.record({
          purchaseId: purchase.poId,
          eventType: "PURCHASE_STOCK_ENTRY_CREATED",
          description: "Se creó el ingreso de stock desde la recepción.",
          performedByUserId: userId ?? null,
          metadata: { receptionId, inventoryDocumentId, items: stockLines },
        }, tx);
      }

      if (serviceConfirmedItemIds.length) {
        await this.history?.record({
          purchaseId: purchase.poId,
          eventType: "PURCHASE_SERVICE_CONFIRMED",
          description: "Se confirmó recepción de items sin movimiento de stock.",
          performedByUserId: userId ?? null,
          metadata: { receptionId, purchaseItemIds: serviceConfirmedItemIds },
        }, tx);
      }

      const confirmed = await this.receptionRepo.findById(receptionId, tx);
      return PurchaseReceptionOutputMapper.toOutput(confirmed!);
    });
  }

  private manager(tx: TransactionContext): EntityManager {
    return (tx as TypeormTransactionContext).manager;
  }
}
