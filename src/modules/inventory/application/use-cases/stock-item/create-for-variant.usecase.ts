import { ConflictException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { CLOCK, ClockPort } from 'src/modules/inventory/domain/ports/clock.port';
import {
  STOCK_ITEM_REPOSITORY,
  StockItemRepository,
} from 'src/modules/inventory/domain/ports/stock-item/stock-item.repository.port';
import { StockItem } from 'src/modules/inventory/domain/entities/stock-item/stock-item';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';


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

  async execute(input: { variantId: string; isActive?: boolean }): Promise<{type:string,message:string}> {
    return this.uow.runInTransaction(async (tx) => {
      const exists = await this.stockItemRepo.findByVariantId(input.variantId, tx);
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
        await this.stockItemRepo.create(stockItem, tx);
      } catch {
        throw new InternalServerErrorException({
          type:'error',
          message:'No se pudo crear el stock item'
        })
      }

      return {type:'success', message:'¡Operación lograda con exito!'};
    });
  }
}
