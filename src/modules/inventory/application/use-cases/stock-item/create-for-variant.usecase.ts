import { ConflictException, Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { StockItemFactory } from "src/modules/inventory/domain/factories/stock-item.factory";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { StockItemAlreadyExistsApplicationError } from "../../errors/stock-item-already-exists.error";
import { CLOCK, ClockPort } from "../../ports/clock.port";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "../../ports/stock-item.repository.port";

@Injectable()
export class CreateStockItemForVariant {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(
    input: { variantId: string; isActive?: boolean },
    tx?: TransactionContext,
  ): Promise<{ message: string }> {
    const work = async (ctx: TransactionContext) => {
      const exists = await this.stockItemRepo.findByVariantId(input.variantId, ctx);
      if (exists) {
        throw new ConflictException(new StockItemAlreadyExistsApplicationError("VARIANT").message);
      }

      const stockItem = StockItemFactory.create({
        type: StockItemType.VARIANT,
        isActive: input.isActive ?? true,
        variantId: input.variantId,
        createdAt: this.clock.now(),
      });

      try {
        await this.stockItemRepo.create(stockItem, ctx);
      } catch {
        throw new InternalServerErrorException("No se pudo crear el stock item");
      }

      return { message: "Stock item creado con exito" };
    };

    if (tx) {
      return work(tx);
    }

    return this.uow.runInTransaction(work);
  }
}
