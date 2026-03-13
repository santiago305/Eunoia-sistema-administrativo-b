import { ConflictException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { CLOCK, ClockPort } from 'src/modules/inventory/domain/ports/clock.port';
import {
  STOCK_ITEM_REPOSITORY,
  StockItemRepository,
} from 'src/modules/inventory/domain/ports/stock-item/stock-item.repository.port';
import { StockItem } from 'src/modules/inventory/domain/entities/stock-item/stock-item';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

@Injectable()
export class CreateStockItemForProduct {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(
    input: { productId: string; isActive?: boolean },
    tx?: TransactionContext,
  ): Promise<{ type: string; message: string }> {
    const work = async (ctx: TransactionContext) => {
      const exists = await this.stockItemRepo.findByProductId(input.productId, ctx);
      if (exists) {
        throw new ConflictException({
          type: 'error',
          message: 'Stock item para este producto ya existe',
        });
      }

      const now = this.clock.now();
      const stockItem = new StockItem(
        undefined,
        StockItemType.PRODUCT,
        input.isActive ?? true,
        input.productId,
        undefined,
        now,
      );
      try {
        await this.stockItemRepo.create(stockItem, ctx);
      } catch {
        throw new InternalServerErrorException({
          type: 'error',
          message: 'No se pudo crear el stock item',
        });
      }

      return { type: 'success', message: '¡Operación exitosa!' };
    };

    if (tx) {
      return work(tx);
    }

    return this.uow.runInTransaction(work);
  }
}
