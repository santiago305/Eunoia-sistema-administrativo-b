import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { DeliveryStatus } from "src/modules/sale-orders/domain/value-objects/delivery-status";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import {
  PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY,
  ProductCatalogDocumentSerieRepository,
} from "src/modules/product-catalog/domain/ports/document-serie.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "src/modules/product-catalog/domain/ports/stock-item.repository";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "src/modules/product-catalog/domain/ports/inventory.repository";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/product-catalog/integration/inventory/ports/inventory-lock.port";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY, SaleOrderItemRepository } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SALE_ORDER_ITEM_COMPONENT_REPOSITORY, SaleOrderItemComponentRepository } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { DeliveryType } from "src/modules/sale-orders/domain/value-objects/delivery-type";

type CreateSaleOrderInput = {
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

@Injectable()
export class CreateSaleOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
    @Inject(PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY)
    private readonly serieRepo: ProductCatalogDocumentSerieRepository,
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

  async execute(input: CreateSaleOrderInput, createdBy: string) {
    return this.uow.runInTransaction(async (tx) => {
      const series = await this.serieRepo.findActiveFor(
        { docType: DocType.SALE_ORDER, warehouseId: input.warehouseId, isActive: true },
        tx,
      );
      if (!series.length) {
        throw new BadRequestException("No hay serie activa para pedidos en este almacén");
      }
      const serie = series[0];
      const correlative = await this.serieRepo.reserveNextNumber(serie.id, tx);

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

      const order = await this.saleOrderRepo.create(
        {
          serie: serie.code,
          correlative,
          warehouseId: input.warehouseId,
          clientId: input.clientId,
          agencyDetail: input.agencyDetail?.trim() ? input.agencyDetail.trim() : null,
          sourceId: input.sourceId ?? null,
          scheduleDate: input.scheduleDate ?? null,
          deliveryDate: input.deliveryDate ?? null,
          deliveryType: input.deliveryType ?? null,
          subTotal: input.subTotal ?? 0,
          deliveryCost: input.deliveryCost ?? 0,
          total: input.total ?? 0,
          note: input.note ?? null,
          createdBy,
          agendaStatus,
          deliveryStatus,
          isActive: true,
        },
        tx,
      );

      const items = await this.saleOrderItemRepo.bulkCreate(
        input.items.map((row) => ({
          saleOrderId: order.id,
          referencePackId: row.referencePackId ?? null,
          description: row.description ?? null,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          total: row.total,
        })),
        tx,
      );

      const componentsInput: Array<{
        saleOrderItemId: string;
        skuId: string;
        referencePackItemId?: string | null;
        quantity: number;
        unitPrice: number;
        total: number;
      }> = [];

      for (let index = 0; index < items.length; index += 1) {
        const savedItem = items[index];
        const requestedItem = input.items[index];

        const referencePackId = requestedItem.referencePackId?.trim();
        const requestedComponents = requestedItem.components ?? [];

        if (!requestedComponents.length && !referencePackId) {
          throw new BadRequestException("Cada item debe incluir components[] o referencePackId");
        }

        if (!referencePackId) {
          for (const c of requestedComponents) {
            componentsInput.push({
              saleOrderItemId: savedItem.id,
              skuId: c.skuId,
              referencePackItemId: c.referencePackItemId ?? null,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              total: c.total,
            });
          }
          continue;
        }

        const pack = await this.packRepo.findByIdWithItems(referencePackId, tx);
        if (!pack) {
          throw new BadRequestException("Pack inválido");
        }

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

        for (const packItem of pack.items) {
          const override = overridesBySkuId.get(packItem.skuId);
          if (override) {
            componentsInput.push({
              saleOrderItemId: savedItem.id,
              skuId: override.skuId,
              referencePackItemId: override.referencePackItemId ?? packItem.id,
              quantity: override.quantity,
              unitPrice: override.unitPrice,
              total: override.total,
            });
            overridesBySkuId.delete(packItem.skuId);
            continue;
          }

          componentsInput.push({
            saleOrderItemId: savedItem.id,
            skuId: packItem.skuId,
            referencePackItemId: packItem.id,
            quantity: Number(savedItem.quantity) * Number(packItem.quantity),
            unitPrice: Number(packItem.price ?? 0),
            total: Number(packItem.lineTotal ?? 0) * Number(savedItem.quantity),
          });
        }

        if (overridesBySkuId.size) {
          throw new BadRequestException("Components contiene SKU(s) que no pertenecen al pack");
        }
      }

      const savedComponents = await this.componentRepo.bulkCreate(componentsInput, tx);

      const stockItemIdBySkuId = new Map<string, string>();
      for (const component of savedComponents) {
        if (stockItemIdBySkuId.has(component.skuId)) continue;
        const stockItem = await this.stockItemRepo.findBySkuId(component.skuId, tx);
        if (!stockItem) {
          throw new BadRequestException("Stock item no encontrado para el SKU");
        }
        stockItemIdBySkuId.set(component.skuId, stockItem.id);
      }

      const requiredByStockItemId = new Map<string, number>();
      for (const component of savedComponents) {
        const stockItemId = stockItemIdBySkuId.get(component.skuId);
        if (!stockItemId) continue;
        requiredByStockItemId.set(
          stockItemId,
          (requiredByStockItemId.get(stockItemId) ?? 0) + Number(component.quantity ?? 0),
        );
      }

      const lockKeys = Array.from(requiredByStockItemId.keys()).map((stockItemId) => ({
        warehouseId: input.warehouseId,
        stockItemId,
      }));
      if (lockKeys.length) {
        await this.inventoryLock.lockSnapshots(lockKeys, tx);
      }

      for (const [stockItemId, qty] of requiredByStockItemId.entries()) {
        const snapshot = await this.inventoryRepo.getSnapshot(
          { warehouseId: input.warehouseId, stockItemId, locationId: null },
          tx,
        );
        const available = snapshot?.available ?? 0;
        if (!snapshot || available < qty) {
          throw new BadRequestException("Stock insuficiente");
        }
      }

      for (const [stockItemId, qty] of requiredByStockItemId.entries()) {
        await this.inventoryRepo.incrementReserved(
          { warehouseId: input.warehouseId, stockItemId, locationId: null, delta: qty },
          tx,
        );
      }

      const paymentsInput = (input.payments ?? []).map((p) => {
        const date = p.date ? new Date(p.date) : new Date();
        if (Number.isNaN(date.getTime())) {
          throw new BadRequestException("Fecha de pago inválida");
        }
        return {
          saleOrderId: order.id,
          bankAccountId: p.bankAccountId?.trim() ? p.bankAccountId.trim() : null,
          date,
          method: p.method,
          operationNumber: p.operationNumber ?? null,
          amount: p.amount,
          note: p.note ?? null,
        };
      });
      try {
        await this.paymentRepo.bulkCreate(paymentsInput, tx);
      } catch (error: any) {
        if (error?.code === "23503") {
          throw new BadRequestException("Cuenta bancaria inválida");
        }
        throw error;
      }

      return {
        orderId: order.id,
        serie: order.serie,
        correlative: order.correlative,
        agendaStatus: order.agendaStatus,
        deliveryStatus: order.deliveryStatus,
      };
    });
  }
}
