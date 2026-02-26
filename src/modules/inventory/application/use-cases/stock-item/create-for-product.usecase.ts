import { ConflictException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { CLOCK, ClockPort } from 'src/modules/inventory/domain/ports/clock.port';
import {
  STOCK_ITEM_REPOSITORY,
  StockItemRepository,
} from 'src/modules/inventory/domain/ports/stock-item/stock-item.repository.port';
import {
  STOCK_ITEM_PRODUCT_REPOSITORY,
  StockItemProductRepository,
} from 'src/modules/inventory/domain/ports/stock-item/stock-item-product.repository.port';
import { StockItem } from 'src/modules/inventory/domain/entities/stock-item/stock-item';
import { StockItemProduct } from 'src/modules/inventory/domain/entities/stock-item/stock-item-product';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

@Injectable()
export class CreateStockItemForProduct {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(STOCK_ITEM_PRODUCT_REPOSITORY)
    private readonly stockItemProductRepo: StockItemProductRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: { productId: string; isActive?: boolean }): Promise<{type:string, message:string}> {
    return this.uow.runInTransaction(async (tx) => {
      const exists = await this.stockItemProductRepo.findByProductId(input.productId, tx);
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
        now
      );
      let created: StockItem;
      try {
        created = await this.stockItemRepo.create(stockItem, tx);
      } catch {
        throw new InternalServerErrorException({
          type:'error',
          message:'No se pudo crear el stock item'
        })
      }
      
      const link = new StockItemProduct(created.stockItemId, input.productId);
      try {
        await this.stockItemProductRepo.create(link, tx);
      } catch {
        throw new InternalServerErrorException({
          type:'error',
          message:'No se pudo crear el stock item product'
        })
      }

      return {type: 'success', message:'¡Operación exitosa!'};
    });
  }
}
