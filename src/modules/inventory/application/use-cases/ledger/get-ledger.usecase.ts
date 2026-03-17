import { Inject, Injectable } from '@nestjs/common';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../../domain/ports/ledger.repository.port';
import { GetLedgerInput } from '../../dto/ledger/input/get-ledger';
import { PaginatedLedgerResult } from '../../dto/ledger/output/paginated-ledger';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from 'src/modules/inventory/domain/ports/stock-item/stock-item.repository.port';


@Injectable()
export class GetLedgerUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async execute(input: GetLedgerInput): Promise<PaginatedLedgerResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 20;
    let stockItemId = input.stockItemId;
    if (stockItemId) {
      const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(stockItemId);
      if (stockItem?.stockItemId) {
        stockItemId = stockItem.stockItemId;
      }
    }
    const { items, total } = await this.ledgerRepo.list({
      ...input,
      stockItemId,
      page,
      limit,
    });

    return {
      items: items.map((e) => ({
        id: e.id!,
        docId: e.docId,
        document: e.document,
        referenceDoc: e.referenceDoc,
        warehouse: e.warehouse,
        stockItem: e.stockItem,
        locationId: e.locationId,
        stockItemId: e.stockItemId,
        direction: e.direction,
        quantity: e.quantity,
        unitCost: e.unitCost ?? null,
        createdAt: e.createdAt,
      })),
      total,
      page,
      limit,
    };
    }
  }
