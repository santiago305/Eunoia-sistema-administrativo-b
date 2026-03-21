import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../../domain/ports/ledger.repository.port';
import { GetLedgerDailyTotalsInput } from '../../dto/ledger/input/get-ledger-daily-totals';
import { LedgerDailyTotal } from '../../dto/ledger/output/ledger-daily-totals';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from 'src/modules/inventory/domain/ports/stock-item/stock-item.repository.port';
import { errorResponse } from 'src/shared/response-standard/response';

@Injectable()
export class GetLedgerDailyTotalsUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async execute(input: GetLedgerDailyTotalsInput): Promise<LedgerDailyTotal[]> {
    if (!input.warehouseId) {
      throw new BadRequestException(errorResponse('Debes elegir un almacen'));
    }
    if (!input.stockItemId) {
      throw new BadRequestException(errorResponse('Debes elegir un producto'));
    }

    let stockItemId = input.stockItemId;
    if (stockItemId) {
      const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(stockItemId);
      if (stockItem?.stockItemId) {
        stockItemId = stockItem.stockItemId;
      }
    }

    return this.ledgerRepo.getDailyTotals({
      ...input,
      stockItemId,
    });
  }
}
