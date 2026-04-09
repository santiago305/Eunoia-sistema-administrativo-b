import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { GetDemandSummaryInput } from '../../dto/analytics/input/get-demand-summary';
import { DemandSummaryOutput } from '../../dto/analytics/output/demand-summary';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../ports/inventory.repository.port';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../ports/ledger.repository.port';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../ports/stock-item.repository.port';
import { CLOCK, ClockPort } from '../../ports/clock.port';

@Injectable()
export class GetDemandSummaryUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: GetDemandSummaryInput): Promise<DemandSummaryOutput> {
    let stockItemId = input.stockItemId;
    const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(stockItemId);
    if (stockItem?.stockItemId) {
      stockItemId = stockItem.stockItemId;
    }

    const { from, to, daysCount } = this.resolveRange(input);
    const horizonDays = input.horizonDays && input.horizonDays > 0 ? input.horizonDays : 7;

    const dailyTotals = await this.ledgerRepo.getSalesDailyTotals({
      warehouseId: input.warehouseId,
      stockItemId,
      locationId: input.locationId,
      from,
      to,
    });

    const totalOut = dailyTotals.reduce((sum, r) => sum + r.salida, 0);
    const avgDaily = daysCount > 0 ? totalOut / daysCount : 0;
    const projection = avgDaily * horizonDays;

    const snapshot = await this.inventoryRepo.getSnapshot({
      warehouseId: input.warehouseId,
      stockItemId,
      locationId: input.locationId,
    });
    const available = snapshot
      ? (snapshot.available ?? (snapshot.onHand - snapshot.reserved))
      : 0;

    const coverageDays = avgDaily > 0 ? available / avgDaily : null;

    return {
      avgDaily,
      projection,
      coverageDays,
      totalOut,
      daysCount,
    };
  }

  private resolveRange(input: GetDemandSummaryInput): { from: Date; to: Date; daysCount: number } {
    const now = this.clock.now();
    const to = input.to ?? now;
    let from = input.from;

    if (!from) {
      const windowDays = input.windowDays && input.windowDays > 0 ? input.windowDays : 7;
      const start = new Date(to);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (windowDays - 1));
      from = start;
    }

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('Rango de fechas inválido');
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysCount = Math.floor((to.getTime() - from.getTime()) / msPerDay) + 1;

    return { from, to, daysCount };
  }
}
