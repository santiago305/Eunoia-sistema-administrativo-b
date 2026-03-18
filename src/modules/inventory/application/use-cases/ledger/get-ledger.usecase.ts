import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../../domain/ports/ledger.repository.port';
import { GetLedgerInput } from '../../dto/ledger/input/get-ledger';
import { PaginatedLedgerResult } from '../../dto/ledger/output/paginated-ledger';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from 'src/modules/inventory/domain/ports/stock-item/stock-item.repository.port';
import { errorResponse } from 'src/shared/response-standard/response';


@Injectable()
export class GetLedgerUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async execute(input: GetLedgerInput): Promise<PaginatedLedgerResult> {

    if(!input.warehouseId){
      throw new BadRequestException(errorResponse('Debes elegir un almacen'));
    }
    if(!input.stockItemId){
      throw new BadRequestException(errorResponse('Debes elegir un producto'));
    }
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
    
    const balances = await this.ledgerRepo.getBalances({
      ...input,
      stockItemId,
    });

    const ordered = [...items].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (at !== bt) return at - bt;
      return (a.id ?? "").localeCompare(b.id ?? "");
    });

    let running = balances.balanceInicial;
    const balanceById = new Map<string, number>();
    for (const e of ordered) {
      const delta = e.direction === "IN" ? e.quantity : -e.quantity;
      running += delta;
      if (e.id) balanceById.set(e.id, running);
    }

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
        balance: e.id ? balanceById.get(e.id) : running,
      })),
      total,
      page,
      limit,
      balances,
    };
    }
  }
