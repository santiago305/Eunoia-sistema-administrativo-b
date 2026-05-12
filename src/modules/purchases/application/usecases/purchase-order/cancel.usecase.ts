                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { PurchaseOrderExpectedScheduler } from "src/modules/purchases/application/jobs/purchase-order-expected-scheduler";
import { PurchaseOrderNotFoundApplicationError } from "../../errors/purchase-order-not-found.error";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY, ProductCatalogStockItemRepository } from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { RegisterProductCatalogInventoryMovement } from "src/modules/product-catalog/application/usecases/register-inventory-movement.usecase";
import { Direction } from "src/shared/domain/value-objects/direction";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/mail/domain/constants/purchase-notification-types";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";

export class CancelPurchaseOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    private readonly scheduler: PurchaseOrderExpectedScheduler,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    private readonly registerInventoryMovement: RegisterProductCatalogInventoryMovement,
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(poId: string): Promise<{ message: string }> {
    const result = await this.uow.runInTransaction(async (tx) => {
      const order = await this.purchaseRepo.findById(poId, tx);
      if (!order) {
        throw new NotFoundException(new PurchaseOrderNotFoundApplicationError().message);
      }

      if (order.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException("Ya esta cancelada la orden");
      }

      if (order.status === PurchaseOrderStatus.RECEIVED) {
        const items = await this.itemRepo.getByPurchaseId(
          order.poId,
          order.currency ?? CurrencyType.PEN,
          tx,
        );

        const outItems: Array<{ skuId: string; quantity: number; direction: Direction; unitCost?: number | null }> = [];
        for (const item of items) {
          const stockItem = await this.stockItemRepo.findById(item.stockItemId, tx);
          if (!stockItem?.skuId) {
            throw new BadRequestException("No se pudo resolver SKU de un item de compra");
          }
          outItems.push({
            skuId: stockItem.skuId,
            quantity: item.quantity * item.factor,
            direction: Direction.OUT,
            unitCost: item.unitPrice.getAmount(),
          });
        }

        try {
          await this.registerInventoryMovement.execute(
            {
              docType: DocType.OUT,
              warehouseId: order.warehouseId,
              direction: Direction.OUT,
              createdBy: order.createdBy ?? null,
              note: `Reversa por cancelación de compra ${order.poId}`,
              referenceId: order.poId,
              referenceType: ReferenceType.PURCHASE,
              items: outItems,
            },
            tx,
          );
        } catch {
          throw new BadRequestException("No se puede cancelar la compra");
        }
      }

      const updated = await this.purchaseRepo.update(
        { poId: order.poId, status: PurchaseOrderStatus.CANCELLED },
        tx,
      );

      if (!updated) {
        throw new BadRequestException("No se pudo actualizar estado");
      }

      this.scheduler.cancel(order.poId);

      return {
        message: "Compra cancelada.",
        createdBy: order.createdBy ?? null,
        poId: order.poId,
      };
    });

    if (result.createdBy) {
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [result.createdBy],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_CANCELLED,
        category: "PURCHASES",
        title: "Compra cancelada",
        message: "Tu compra fue cancelada.",
        priority: "NORMAL",
        actionUrl: "/compras",
        actionLabel: "Ver compra",
        sourceModule: "purchases",
        sourceEntityType: "purchase_order",
        sourceEntityId: result.poId,
        metadata: { poId: result.poId },
      });
    }

    return { message: result.message };
  }
}
