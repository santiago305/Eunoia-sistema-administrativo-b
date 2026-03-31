import { ConflictException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { StockItem } from 'src/modules/inventory/domain/entities/stock-item/stock-item';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';
import { CLOCK, ClockPort } from '../../ports/clock.port';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../ports/stock-item.repository.port';


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
  ): Promise<{ type: string; message: string }> {
    const work = async (ctx: TransactionContext) => {
      const exists = await this.stockItemRepo.findByVariantId(input.variantId, ctx);
      if (exists) {
        throw new ConflictException({
          type: 'error',
          message: 'Stock item para esta variante ya existe',
        });
      }

      const now = this.clock.now();
      const stockItem = new StockItem(
        undefined,
        StockItemType.VARIANT,
        input.isActive ?? true,
        undefined,
        input.variantId,
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

      return { type: 'success', message: '¡Operación lograda con exito!' };
    };

    if (tx) {
      return work(tx);
    }

    return this.uow.runInTransaction(work);
  }
}
