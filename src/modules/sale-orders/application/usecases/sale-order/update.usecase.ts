import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "src/modules/product-catalog/domain/ports/stock-item.repository";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "src/modules/product-catalog/domain/ports/inventory.repository";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/product-catalog/integration/inventory/ports/inventory-lock.port";
import { DeliveryType } from "src/modules/sale-orders/domain/value-objects/delivery-type";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY, SaleOrderItemRepository } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";

type UpdateSaleOrderInput = {
  saleOrderId: string;
  warehouseId: string;
  clientId: string;
  agencyDetail?: string;
  sourceId?: string;
  scheduleDate?: string;
  deliveryDate?: string;
  deliveryType?: DeliveryType;
  note?: string;
  subTotal?: number;
  deliveryCost?: number;
  total?: number;
  items: Array<{
    quantity: number;
    unitPrice: number;
    total: number;
    description?: string;
    referencePackId?: string;
    components?: Array<{
      skuId: string;
      quantity: number;
      unitPrice: number;
      total: number;
      referencePackItemId?: string;
    }>;
  }>;
  payments?: Array<{
    bankAccountId?: string;
    method: string;
    amount: number;
    date?: string;
    operationNumber?: string;
    note?: string;
  }>;
};

type RequiredStockKey = `${string}:${string}`; // `${warehouseId}:${stockItemId}`

const hasWarehouseId = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0 && value !== "null";

@Injectable()
export class UpdateSaleOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(INVENTORY_LOCK)
    private readonly inventoryLock: InventoryLock,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_ITEM_REPOSITORY)
    private readonly saleOrderItemRepo: SaleOrderItemRepository,
    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly componentRepo: SaleOrderItemComponentRepository,
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
  ) {}

  async execute(input: UpdateSaleOrderInput) {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order) throw new BadRequestException("Pedido no encontrado");

      const oldWarehouseId = order.warehouseId;
      const newWarehouseId = input.warehouseId;

      const existingItems = await this.saleOrderItemRepo.listBySaleOrderId(input.saleOrderId, tx);
      const existingItemIds = existingItems.map((row) => row.id);
      const existingComponents = await this.componentRepo.listBySaleOrderItemIds(existingItemIds, tx);

      const stockItemIdBySkuId = new Map<string, string>();
      const getStockItemId = async (skuId: string) => {
        const cached = stockItemIdBySkuId.get(skuId);
        if (cached) return cached;
        const stockItem = await this.stockItemRepo.findBySkuId(skuId, tx);
        if (!stockItem) throw new BadRequestException("Stock item no encontrado para el SKU");
        stockItemIdBySkuId.set(skuId, stockItem.id);
        return stockItem.id;
      };

      const oldRequiredByKey = new Map<RequiredStockKey, number>();
      if (hasWarehouseId(oldWarehouseId)) {
        for (const c of existingComponents) {
          const stockItemId = await getStockItemId(c.skuId);
          const key = `${oldWarehouseId}:${stockItemId}` as RequiredStockKey;
          oldRequiredByKey.set(key, (oldRequiredByKey.get(key) ?? 0) + Number(c.quantity ?? 0));
        }
      }

      if (!input.items?.length) throw new BadRequestException("Items requeridos");

      const componentPlansByItemIndex: Array<
        Array<{
          skuId: string;
          referencePackItemId?: string | null;
          quantity: number;
          unitPrice: number;
          total: number;
        }>
      > = [];

      for (const item of input.items) {
        const referencePackId = item.referencePackId?.trim();
        const requestedComponents = item.components ?? [];

        if (!requestedComponents.length && !referencePackId) {
          throw new BadRequestException("Cada item debe incluir components[] o referencePackId");
        }

        if (!referencePackId) {
          componentPlansByItemIndex.push(
            requestedComponents.map((c) => ({
              skuId: c.skuId,
              referencePackItemId: c.referencePackItemId ?? null,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              total: c.total,
            })),
          );
          continue;
        }

        const pack = await this.packRepo.findByIdWithItems(referencePackId, tx);
        if (!pack) throw new BadRequestException("Pack inválido");

        const overridesBySkuId = new Map(
          requestedComponents.map((c) => [
            c.skuId,
            {
              skuId: c.skuId,
              referencePackItemId: c.referencePackItemId ?? null,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              total: c.total,
            },
          ]),
        );

        const plans: Array<{
          skuId: string;
          referencePackItemId?: string | null;
          quantity: number;
          unitPrice: number;
          total: number;
        }> = [];

        for (const packItem of pack.items) {
          const override = overridesBySkuId.get(packItem.skuId);
          if (override) {
            plans.push({
              skuId: override.skuId,
              referencePackItemId: override.referencePackItemId ?? packItem.id,
              quantity: override.quantity,
              unitPrice: override.unitPrice,
              total: override.total,
            });
            overridesBySkuId.delete(packItem.skuId);
            continue;
          }

          plans.push({
            skuId: packItem.skuId,
            referencePackItemId: packItem.id,
            quantity: Number(item.quantity) * Number(packItem.quantity),
            unitPrice: Number(packItem.price ?? 0),
            total: Number(packItem.lineTotal ?? 0) * Number(item.quantity),
          });
        }

        if (overridesBySkuId.size) {
          throw new BadRequestException("Components contiene SKU(s) que no pertenecen al pack");
        }

        componentPlansByItemIndex.push(plans);
      }

      const newRequiredByKey = new Map<RequiredStockKey, number>();
      for (const plans of componentPlansByItemIndex) {
        for (const c of plans) {
          const stockItemId = await getStockItemId(c.skuId);
          const key = `${newWarehouseId}:${stockItemId}` as RequiredStockKey;
          newRequiredByKey.set(key, (newRequiredByKey.get(key) ?? 0) + Number(c.quantity ?? 0));
        }
      }

      const keysUnion = new Set<RequiredStockKey>([...oldRequiredByKey.keys(), ...newRequiredByKey.keys()]);
      const lockKeys = Array.from(keysUnion).map((key) => {
        const [warehouseId, stockItemId] = key.split(":");
        return { warehouseId, stockItemId };
      });
      if (lockKeys.length) {
        await this.inventoryLock.lockSnapshots(lockKeys, tx);
      }

      for (const key of keysUnion) {
        const [warehouseId, stockItemId] = key.split(":");
        const snapshot = await this.inventoryRepo.getSnapshot({ warehouseId, stockItemId, locationId: null }, tx);
        const availableNow = snapshot?.available ?? 0;

        const oldQty = oldRequiredByKey.get(key) ?? 0;
        const newQty = newRequiredByKey.get(key) ?? 0;

        const availableForUpdate = availableNow + oldQty;
        if (!snapshot || availableForUpdate < newQty) {
          throw new BadRequestException("Stock insuficiente");
        }
      }

      for (const key of keysUnion) {
        const [warehouseId, stockItemId] = key.split(":");
        const oldQty = oldRequiredByKey.get(key) ?? 0;
        const newQty = newRequiredByKey.get(key) ?? 0;
        const delta = newQty - oldQty;
        if (!delta) continue;

        await this.inventoryRepo.incrementReserved(
          { warehouseId, stockItemId, locationId: null, delta },
          tx,
        );
      }

      // Persist changes
      await this.componentRepo.deleteBySaleOrderItemIds(existingItemIds, tx);
      await this.saleOrderItemRepo.deleteBySaleOrderId(input.saleOrderId, tx);
      await this.paymentRepo.deleteBySaleOrderId(input.saleOrderId, tx);

      const updated = await this.saleOrderRepo.update(
        {
          saleOrderId: input.saleOrderId,
          warehouseId: input.warehouseId,
          clientId: input.clientId,
          agencyDetail: input.agencyDetail?.trim() ? input.agencyDetail.trim() : null,
          sourceId: input.sourceId?.trim() ? input.sourceId.trim() : null,
          scheduleDate: input.scheduleDate ?? null,
          deliveryDate: input.deliveryDate ?? null,
          deliveryType: input.deliveryType ?? null,
          subTotal: input.subTotal ?? 0,
          deliveryCost: input.deliveryCost ?? 0,
          total: input.total ?? 0,
          note: input.note ?? null,
        },
        tx,
      );

      const savedItems = await this.saleOrderItemRepo.bulkCreate(
        input.items.map((row) => ({
          saleOrderId: updated.id,
          referencePackId: row.referencePackId?.trim() ? row.referencePackId.trim() : null,
          description: row.description?.trim() ? row.description.trim() : null,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          total: row.total,
        })),
        tx,
      );

      const componentsToSave = savedItems.flatMap((savedItem, index) =>
        (componentPlansByItemIndex[index] ?? []).map((c) => ({
          saleOrderItemId: savedItem.id,
          skuId: c.skuId,
          referencePackItemId: c.referencePackItemId ?? null,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          total: c.total,
        })),
      );
      if (componentsToSave.length) {
        await this.componentRepo.bulkCreate(componentsToSave, tx);
      }

      const paymentsInput = (input.payments ?? []).map((p) => {
        const date = p.date ? new Date(p.date) : new Date();
        if (Number.isNaN(date.getTime())) {
          throw new BadRequestException("Fecha de pago inválida");
        }
        return {
          saleOrderId: updated.id,
          bankAccountId: p.bankAccountId?.trim() ? p.bankAccountId.trim() : null,
          date,
          method: p.method,
          operationNumber: p.operationNumber ?? null,
          amount: p.amount,
          note: p.note ?? null,
        };
      });
      try {
        if (paymentsInput.length) await this.paymentRepo.bulkCreate(paymentsInput, tx);
      } catch (error: any) {
        if (error?.code === "23503") {
          throw new BadRequestException("Cuenta bancaria inválida");
        }
        throw error;
      }

      const toDateKey = (value: Date) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Lima",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(value);

      const todayKey = toDateKey(new Date());
      const deliveryDateKey = input.deliveryDate ? input.deliveryDate.slice(0, 10) : null;
      const isDeliveryTodayOrPast = !!deliveryDateKey && deliveryDateKey <= todayKey;

      const agendaStatus = isDeliveryTodayOrPast ? AgendaStatus.PROGRAMMED : AgendaStatus.COORDINATED;
      const deliveryStatus = isDeliveryTodayOrPast
        ? input.deliveryType === DeliveryType.ABONADO_ENVIO
          ? DeliveryStatus.WAITING
          : input.deliveryType === DeliveryType.CONTRA_ENTREGA
            ? DeliveryStatus.IN_PROGRESS
            : null
        : null;

      const updatedWithStatuses = await this.saleOrderRepo.updateStatuses(
        { saleOrderId: updated.id, agendaStatus, deliveryStatus },
        tx,
      );

      return {
        orderId: updatedWithStatuses.id,
        serie: updatedWithStatuses.serie ?? null,
        correlative: updatedWithStatuses.correlative ?? null,
        agendaStatus: updatedWithStatuses.agendaStatus,
        deliveryStatus: updatedWithStatuses.deliveryStatus ?? null,
      };
    });
  }
}
