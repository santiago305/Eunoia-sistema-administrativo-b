import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { ProductionOrderItemFactory } from "src/modules/production/domain/factories/production-order-item.factory";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/application/ports/stock-item.repository.port";
import { AddProductionOrderItemInput } from "../../dto/production-order/input/add-production-order-item";
import { ProductionOrderItemOutput } from "../../dto/production-order/output/production-order-item-out";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";

@Injectable()
export class AddProductionOrderItem {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async execute(
    input: AddProductionOrderItemInput,
    tx?: TransactionContext,
  ): Promise<ProductionOrderItemOutput> {
    const work = async (ctx: TransactionContext) => {
      const order = await this.orderRepo.findById(input.productionId, ctx);

      if (!order) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      const finishedStockItem = await this.stockItemRepo.findById(input.finishedItemId, ctx);
      if (!finishedStockItem?.stockItemId) {
        throw new NotFoundException("Stock item terminado no encontrado");
      }

      try {
        order.assertCanAddItem();
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      let item;
      try {
        item = ProductionOrderItemFactory.createNew({
          productionId: input.productionId,
          finishedItemId: input.finishedItemId,
          fromLocationId: input.fromLocationId,
          toLocationId: input.toLocationId,
          quantity: input.quantity,
          unitCost: input.unitCost,
          type: input.type,
        });
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      const saved = await this.orderRepo.addItem(item, ctx);

      return {
        id: saved.productionItemId!,
        productionId: saved.productionId,
        finishedItemId: saved.finishedItemId,
        finishedItemType: finishedStockItem.type,
        fromLocationId: saved.fromLocationId,
        toLocationId: saved.toLocationId,
        quantity: saved.quantity,
        wasteQty: saved.wasteQty ?? 0,
        unitCost: saved.unitCost,
      };
    };

    if (tx) {
      return work(tx);
    }

    return this.uow.runInTransaction(work);
  }
}
