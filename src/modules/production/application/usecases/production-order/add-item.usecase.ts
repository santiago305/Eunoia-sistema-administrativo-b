import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { AddProductionOrderItemInput } from "../../dto/production-order/input/add-production-order-item";
import { ProductionOrderItemOutput } from "../../dto/production-order/output/production-order-item-out";
import { ProductionOrderItem } from "src/modules/production/domain/entity/production-order-item";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { errorResponse } from "src/shared/response-standard/response";


@Injectable()
export class AddProductionOrderItem {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
  ) {}

  async execute(
    input: AddProductionOrderItemInput,
    tx?: TransactionContext,
  ): Promise<ProductionOrderItemOutput> {
    const work = async (ctx: TransactionContext) => {
      const order = await this.orderRepo.findById(input.productionId, ctx);

      if (!order) {
        throw new NotFoundException({ type: "error", message: "Orden de produccion no encontrada" });
      }
      if (order.status !== ProductionStatus.DRAFT) {
        throw new BadRequestException({ type: "error", message: "Solo se puede agregar items a una orden en DRAFT" });
      }
      if (input.quantity === undefined || input.quantity === null || input.quantity === 0) {
        throw new BadRequestException(errorResponse('Cantidad no validad'));
      }

      const item = new ProductionOrderItem(
        undefined,
        input.productionId,
        input.finishedItemId,
        input.fromLocationId,
        input.toLocationId,
        input.quantity,
        0,
        input.unitCost,
        input.type
      );

      const saved = await this.orderRepo.addItem(item, ctx);

      return {
        id: saved.productionItemId!,
        productionId: saved.productionId,
        finishedItemId: saved.finishedItemId,
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
