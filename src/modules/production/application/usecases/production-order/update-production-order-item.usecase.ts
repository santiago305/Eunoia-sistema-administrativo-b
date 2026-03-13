import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { UpdateProductionOrderItemInput } from "../../dto/production-order/input/update-production-order-item";
import { ProductionOrderItemOutput } from "../../dto/production-order/output/production-order-item-out";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/domain/ports/product-recipe.repository";
import { INVENTORY_REPOSITORY, InventoryRepository } from "src/modules/inventory/domain/ports/inventory.repository.port";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/inventory/domain/ports/inventory-lock.port";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/domain/ports/stock-item/stock-item.repository.port";

@Injectable()
export class UpdateProductionOrderItem {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(INVENTORY_LOCK)
    private readonly lock: InventoryLock,
  ) {}

  async execute(input: UpdateProductionOrderItemInput): Promise<ProductionOrderItemOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.orderRepo.findById(input.productionId, tx);
      if (!order) {
        throw new NotFoundException({ type: "error", message: "Orden de produccion no encontrada" });
      }
      if (order.status !== ProductionStatus.DRAFT) {
        throw new BadRequestException({ type: "error", message: "Solo se puede actualizar items en DRAFT" });
      }

      const current = await this.orderRepo.findItemById(input.productionId, input.itemId, tx);
      if (!current) {
        throw new NotFoundException({ type: "error", message: "Item no encontrado" });
      }

      const stockItemCache = new Map<string, string>();
      const getStockItemIdForVariant = async (variantId: string) => {
        const cached = stockItemCache.get(variantId);
        if (cached) return cached;
        const stockItem = await this.stockItemRepo.findByVariantId(variantId, tx);
        if (!stockItem?.stockItemId) {
          throw new NotFoundException({ type: "error", message: "Stock item de materia prima no encontrado" });
        }
        stockItemCache.set(variantId, stockItem.stockItemId);
        return stockItem.stockItemId;
      };

      const getVariantIdForFinishedItem = async (finishedItemId: string) => {
        const finishedItem = await this.stockItemRepo.findById(finishedItemId, tx);
        if (!finishedItem?.variantId) {
          throw new NotFoundException({ type: "error", message: "Stock item de producto terminado no encontrado" });
        }
        return finishedItem.variantId;
      };

      const newFinishedItemId = input.finishedItemId ?? current.finishedItemId;
      const newFromLocationId = input.fromLocationId ?? current.fromLocationId;
      const newQty = input.quantity ?? current.quantity;

      const currentFinishedVariantId = await getVariantIdForFinishedItem(current.finishedItemId);
      const newFinishedVariantId = await getVariantIdForFinishedItem(newFinishedItemId);

      const prevRecipes = await this.recipeRepo.listByVariantId(currentFinishedVariantId, tx);
      const newRecipes = await this.recipeRepo.listByVariantId(newFinishedVariantId, tx);

      // consolidar consumo anterior
      const prevConsumption = [];
      for (const r of prevRecipes) {
        const stockItemId = await getStockItemIdForVariant(r.primaVariantId);
        prevConsumption.push({
          stockItemId,
          locationId: current.fromLocationId ?? undefined,
          qty: r.quantity * current.quantity,
        });
      }

      // consumo nuevo
      const nextConsumption = [];
      for (const r of newRecipes) {
        const stockItemId = await getStockItemIdForVariant(r.primaVariantId);
        nextConsumption.push({
          stockItemId,
          locationId: newFromLocationId ?? undefined,
          qty: r.quantity * newQty,
        });
      }

      // aplicar diferencia de reservas
      const diffMap = new Map<string, { stockItemId: string; locationId?: string; qty: number }>();

      const addToDiff = (stockItemId: string, locationId: string | undefined, qty: number) => {
        const key = `${stockItemId}::${locationId ?? "null"}`;
        const curr = diffMap.get(key);
        if (curr) curr.qty += qty;
        else diffMap.set(key, { stockItemId, locationId, qty });
      };

      for (const p of prevConsumption) addToDiff(p.stockItemId, p.locationId, -p.qty);
      for (const n of nextConsumption) addToDiff(n.stockItemId, n.locationId, n.qty);

      const diff = Array.from(diffMap.values()).filter((d) => d.qty !== 0);

      // lock snapshots
      const keys = diff.map((d) => ({
        warehouseId: order.fromWarehouseId,
        stockItemId: d.stockItemId,
        locationId: d.locationId,
      }));
      await this.lock.lockSnapshots(keys, tx);

      // validar y aplicar diff
      for (const d of diff) {
        const snapshot = await this.inventoryRepo.getSnapshot(
          {
            warehouseId: order.fromWarehouseId,
            stockItemId: d.stockItemId,
            locationId: d.locationId,
          },
          tx,
        );

        const available = snapshot?.available ?? 0;
        const reserved = snapshot?.reserved ?? 0;

        if (d.qty > 0 && available < d.qty) {
          throw new BadRequestException({
            type: "error",
            message: "Materia prima insuficiente",
            item: {
              stockItemId: d.stockItemId,
              locationId: d.locationId,
              required: d.qty,
              available,
            },
          });
        }

        if (d.qty < 0 && reserved < Math.abs(d.qty)) {
          throw new BadRequestException({
            type: "error",
            message: "Reserva insuficiente",
            item: {
              stockItemId: d.stockItemId,
              locationId: d.locationId,
              required: Math.abs(d.qty),
              reserved,
            },
          });
        }
      }

      for (const d of diff) {
        await this.inventoryRepo.incrementReserved(
          {
            warehouseId: order.fromWarehouseId,
            stockItemId: d.stockItemId,
            locationId: d.locationId,
            delta: d.qty,
          },
          tx,
        );
      }

      const updated = await this.orderRepo.updateItem(input, tx);
      if (!updated) {
        throw new NotFoundException({ type: "error", message: "Item no encontrado" });
      }

      return {
        id: updated.productionItemId!,
        productionId: updated.productionId,
        finishedItemId: updated.finishedItemId,
        fromLocationId: updated.fromLocationId,
        toLocationId: updated.toLocationId,
        quantity: updated.quantity,
        unitCost: updated.unitCost,
      };
    });
  }
}
