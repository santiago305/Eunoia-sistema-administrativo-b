import { Injectable, Logger } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { Inject } from "@nestjs/common";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { AdvanceSaleOrderStateUseCase } from "src/modules/workflow/application/usecases/advance-sale-order-state.usecase";

function toDateOnlyIso(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const byType = new Map(parts.map((p) => [p.type, p.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

@Injectable()
export class UpdateSaleOrdersDeliveryDateTodayJob {
  private readonly logger = new Logger(UpdateSaleOrdersDeliveryDateTodayJob.name);

  constructor(
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    private readonly advanceSaleOrderState: AdvanceSaleOrderStateUseCase,
  ) {}

  async run(input?: { limit?: number; timeZone?: string }) {
    const timeZone = input?.timeZone ?? "America/Lima";
    const limit = input?.limit ?? 500;
    const todayIso = toDateOnlyIso(this.clock.now(), timeZone);

    const ids = await this.saleOrderRepo.listIdsToProgramForDeliveryDate({
      deliveryDate: todayIso,
      limit,
    });

    let updated = 0;
    let failed = 0;

    for (const saleOrderId of ids) {
      try {
        await this.advanceSaleOrderState.execute({
          saleOrderId,
          transitionCode: "DELIVERY_DATE_REACHED",
          executedBy: "00000000-0000-0000-0000-000000000001",
          metadata: { source: "delivery-date-job" },
        });
        updated += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn(`deliveryDateToday failed saleOrderId=${saleOrderId}: ${(error as Error).message}`);
      }
    }

    this.logger.debug(`deliveryDateToday updated=${updated} date=${todayIso}`);

    return {
      date: todayIso,
      found: ids.length,
      updated,
      failed,
      saleOrderIds: ids,
    };
  }
}
