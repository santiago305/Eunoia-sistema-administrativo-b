import { Inject, Injectable } from '@nestjs/common';
import { LEDGER_REPOSITORY, LedgerRepository } from '../../ports/ledger.repository.port';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../ports/stock-item.repository.port';
import { CLOCK, ClockPort } from '../../ports/clock.port';
import { GetMonthlyProjectionInput } from '../../dto/analytics/input/get-monthly-projection';
import { MonthlyProjectionOutput } from '../../dto/analytics/output/monthly-projection';

@Injectable()
export class GetMonthlyProjectionUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY)
    private readonly ledgerRepo: LedgerRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: GetMonthlyProjectionInput): Promise<MonthlyProjectionOutput> {
    let stockItemId = input.stockItemId;
    if (stockItemId) {
      const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(stockItemId);
      if (stockItem?.stockItemId) {
        stockItemId = stockItem.stockItemId;
      }
    }

    const monthsCount = this.normalizeMonths(input.months);
    const endMonth = this.resolveEndMonth(input.to);
    const startMonth = new Date(endMonth);
    startMonth.setMonth(startMonth.getMonth() - (monthsCount - 1));
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const endOfEndMonth = new Date(endMonth);
    endOfEndMonth.setMonth(endOfEndMonth.getMonth() + 1, 0);
    endOfEndMonth.setHours(23, 59, 59, 999);

    const totals = await this.ledgerRepo.getSalesMonthlyTotals({
      warehouseId: input.warehouseId,
      stockItemId,
      locationId: input.locationId,
      from: startMonth,
      to: endOfEndMonth,
    });

    const totalsByMonth = new Map(totals.map((t) => [t.month, t.salida]));
    const months = this.buildMonthList(startMonth, monthsCount).map((m) => ({
      month: m,
      salida: totalsByMonth.get(m) ?? 0,
    }));

    const xo = months[0] ?? null;
    const last = months[months.length - 1] ?? null;
    const xu = last && last.salida > 0 ? last : xo;

    const growthRate = this.computeGrowthRate(xo?.salida ?? 0, xu?.salida ?? 0, monthsCount);
    const projectedNextMonth = xu ? xu.salida * (1 + growthRate) : 0;

    const currentMonth = this.formatMonth(this.clock.now());
    const projectedMonth = this.formatMonth(this.addMonths(endMonth, 1));
    let salesActual = months.find((m) => m.month === currentMonth) ?? null;
    if (!salesActual && projectedMonth === currentMonth) {
      const currentStart = new Date(this.clock.now());
      currentStart.setDate(1);
      currentStart.setHours(0, 0, 0, 0);
      const currentEnd = new Date(this.clock.now());
      const currentTotals = await this.ledgerRepo.getSalesMonthlyTotals({
        warehouseId: input.warehouseId,
        stockItemId,
        locationId: input.locationId,
        from: currentStart,
        to: currentEnd,
      });
      const current = currentTotals.find((t) => t.month === currentMonth);
      salesActual = current ? { month: current.month, salida: current.salida } : { month: currentMonth, salida: 0 };
    }

    return {
      months,
      xo,
      xu,
      salesActual,
      growthRate,
      projectedNextMonth,
      monthsCount,
    };
  }

  private normalizeMonths(input?: number): number {
    if (!input || input <= 0) return 5;
    return Math.max(2, Math.floor(input));
  }

  private resolveEndMonth(to?: Date): Date {
    const base = to ? new Date(to) : this.clock.now();
    const endMonth = new Date(base);
    // Usar mes anterior si no se pasa "to"
    if (!to) {
      endMonth.setMonth(endMonth.getMonth() - 1);
    }
    endMonth.setDate(1);
    endMonth.setHours(0, 0, 0, 0);
    return endMonth;
  }

  private buildMonthList(start: Date, count: number): string[] {
    const months: string[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < count; i += 1) {
      months.push(this.formatMonth(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }

  private formatMonth(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private addMonths(d: Date, months: number): Date {
    const copy = new Date(d);
    copy.setMonth(copy.getMonth() + months);
    return copy;
  }

  private computeGrowthRate(xo: number, xu: number, n: number): number {
    if (n <= 1) return 0;
    if (xo <= 0 || xu <= 0) return 0;
    return Math.pow(xu / xo, 1 / (n - 1)) - 1;
  }
}
