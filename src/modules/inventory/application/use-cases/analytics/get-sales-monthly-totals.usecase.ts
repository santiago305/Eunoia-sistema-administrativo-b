import { Inject, Injectable } from '@nestjs/common';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../ports/ledger.repository.port';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../ports/stock-item.repository.port';
import { GetSalesTotalsInput } from '../../dto/analytics/input/get-sales-totals';
import { SalesMonthlyTotal } from '../../dto/analytics/output/sales-monthly-total';

@Injectable()
export class GetSalesMonthlyTotalsUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async execute(input: GetSalesTotalsInput): Promise<SalesMonthlyTotal[]> {
    let stockItemId = input.stockItemId;
    if (stockItemId) {
      const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(stockItemId);
      if (stockItem?.stockItemId) {
        stockItemId = stockItem.stockItemId;
      }
    }

    return this.ledgerRepo.getSalesMonthlyTotals({
      ...input,
      stockItemId,
    });
  }
}
