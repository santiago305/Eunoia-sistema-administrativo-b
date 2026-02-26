import { ConflictException, Inject, InternalServerErrorException } from '@nestjs/common';
import { UNIT_OF_WORK, UnitOfWork } from 'src/modules/inventory/domain/ports/unit-of-work.port';
import { CLOCK, ClockPort } from 'src/modules/inventory/domain/ports/clock.port';
import {
  STOCK_ITEM_REPOSITORY,
  StockItemRepository,
} from 'src/modules/inventory/domain/ports/stock-item/stock-item.repository.port';
import {
  STOCK_ITEM_VARIANT_REPOSITORY,
  StockItemVariantRepository,
} from 'src/modules/inventory/domain/ports/stock-item/stock-item-variant.repository.port';
import { StockItem } from 'src/modules/inventory/domain/entities/stock-item/stock-item';
import { StockItemVariant } from 'src/modules/inventory/domain/entities/stock-item/stock-item-variant';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

export class CreateStockItemForVariant {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(STOCK_ITEM_VARIANT_REPOSITORY)
    private readonly stockItemVariantRepo: StockItemVariantRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: { variantId: string; isActive?: boolean }): Promise<{type:string,message:string}> {
    return this.uow.runInTransaction(async (tx) => {
      const exists = await this.stockItemVariantRepo.findByVariantId(input.variantId, tx);
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
        now
      );
      try {
        await this.stockItemRepo.create(stockItem, tx);
      } catch {
        throw new InternalServerErrorException({
          type:'error',
          message:'No se pudo crear el stock item'
        })
      }
      
      const link = new StockItemVariant(stockItem.stockItemId, input.variantId);
      try {
        await this.stockItemVariantRepo.create(link, tx);
      } catch {
        throw new InternalServerErrorException({
          type:'error',
          message:'No se pudo crear el stock item variant'
        })
      }

      return {type:'success', message:'¡Operación lograda con exito!'};
    });
  }
}
