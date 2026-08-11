import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import {
  SALE_ORDER_SUPPLY_ITEM_REPOSITORY,
  SaleOrderSupplyItemRepository,
  SaleOrderSupplyRecipeItem,
} from '../../domain/ports/sale-order-supply-item.repository';

export type SaleOrderSupplyInput = {
  supplySkuId: string;
  quantity: number;
  unitId: string;
  referenceRecipeItemId?: string | null;
};

@Injectable()
export class SaleOrderSuppliesService {
  constructor(
    @Inject(SALE_ORDER_SUPPLY_ITEM_REPOSITORY)
    private readonly repository: SaleOrderSupplyItemRepository,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWork,
  ) {}

  listBySaleOrderId(saleOrderId: string, tx?: TransactionContext) {
    return this.repository.listBySaleOrderId(saleOrderId, tx);
  }

  replace(saleOrderId: string, items: SaleOrderSupplyInput[], tx?: TransactionContext) {
    return this.inTransaction(tx, (context) => this.replaceInsideTransaction(saleOrderId, items, context));
  }

  copyFromWorkflowRecipe(saleOrderId: string, workflowId: string, tx?: TransactionContext) {
    return this.inTransaction(tx, async (context) => {
      const recipeItems = await this.repository.findRecipeItemsByWorkflowId(workflowId, context);
      return this.replaceInsideTransaction(
        saleOrderId,
        recipeItems.map((item) => ({
          supplySkuId: item.supplySkuId,
          quantity: item.quantity,
          unitId: item.unitId,
          referenceRecipeItemId: item.recipeItemId,
        })),
        context,
        recipeItems,
      );
    });
  }

  private async replaceInsideTransaction(
    saleOrderId: string,
    items: SaleOrderSupplyInput[],
    tx: TransactionContext,
    knownRecipeItems?: SaleOrderSupplyRecipeItem[],
  ) {
    if (!(await this.repository.saleOrderExists(saleOrderId, tx))) {
      throw new NotFoundException('Pedido no encontrado');
    }
    const normalized = this.normalizeAndValidate(items);
    const skuIds = [...new Set(normalized.map((item) => item.supplySkuId))];
    const unitIds = [...new Set(normalized.map((item) => item.unitId))];
    const recipeItemIds = [...new Set(normalized
      .map((item) => item.referenceRecipeItemId)
      .filter((id): id is string => Boolean(id)))];

    const [{ supplies, units }, recipeItems] = await Promise.all([
      this.repository.findCatalogItems(skuIds, unitIds, tx),
      knownRecipeItems
        ? Promise.resolve(knownRecipeItems)
        : this.repository.findRecipeItemsByIds(recipeItemIds, tx),
    ]);
    const supplyById = new Map(supplies.map((item) => [item.supplySkuId, item]));
    const unitById = new Map(units.map((item) => [item.unitId, item]));
    const recipeById = new Map(recipeItems.map((item) => [item.recipeItemId, item]));

    if (supplyById.size !== skuIds.length || supplies.some((item) => !item.isActiveSupply)) {
      throw new BadRequestException('Los insumos deben ser SKUs de insumos activos');
    }
    if (unitById.size !== unitIds.length) {
      throw new BadRequestException('Una o más unidades no existen');
    }
    for (const item of normalized) {
      if (!item.referenceRecipeItemId) continue;
      const reference = recipeById.get(item.referenceRecipeItemId);
      if (!reference || reference.supplySkuId !== item.supplySkuId) {
        throw new BadRequestException('La referencia de receta no corresponde al insumo');
      }
    }

    return this.repository.replace(saleOrderId, normalized.map((item) => {
      const supply = supplyById.get(item.supplySkuId)!;
      const unit = unitById.get(item.unitId)!;
      return {
        ...item,
        supplyNameSnapshot: supply.supplyName,
        skuNameSnapshot: supply.skuName,
        backendSkuSnapshot: supply.backendSku,
        customSkuSnapshot: supply.customSku,
        unitNameSnapshot: unit.unitName,
        unitCodeSnapshot: unit.unitCode,
      };
    }), tx);
  }

  private normalizeAndValidate(items: SaleOrderSupplyInput[]) {
    const skuIds = new Set<string>();
    return items.map((item) => {
      if (!item.supplySkuId || !item.unitId) {
        throw new BadRequestException('Cada insumo requiere SKU y unidad');
      }
      if (skuIds.has(item.supplySkuId)) {
        throw new BadRequestException('Un insumo no puede repetirse dentro del pedido');
      }
      skuIds.add(item.supplySkuId);
      const quantity = Math.round((item.quantity + Number.EPSILON) * 100) / 100;
      if (!Number.isFinite(item.quantity) || item.quantity < 0.01 || Math.abs(item.quantity - quantity) >= 1e-9) {
        throw new BadRequestException('La cantidad debe ser mayor o igual a 0.01 y tener máximo 2 decimales');
      }
      return { ...item, quantity, referenceRecipeItemId: item.referenceRecipeItemId ?? null };
    });
  }

  private inTransaction<T>(
    tx: TransactionContext | undefined,
    work: (context: TransactionContext) => Promise<T>,
  ): Promise<T> {
    return tx ? work(tx) : this.unitOfWork.runInTransaction(work);
  }
}
