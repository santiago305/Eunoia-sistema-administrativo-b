import { Injectable, Logger } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { Inject } from "@nestjs/common";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { AgendaStatus } from "src/modules/sale-orders/domain/value-objects/agenda-status";
import { UpdateSaleOrderStatusUsecase } from "../usecases/sale-order/update-status.usecase";

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
    private readonly updateSaleOrderStatusUsecase: UpdateSaleOrderStatusUsecase,
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

    for (const saleOrderId of ids) {
      await this.updateSaleOrderStatusUsecase.execute({
        saleOrderId,
        agendaStatus: AgendaStatus.PROGRAMMED,
      });

      updated += 1;
    }

    this.logger.debug(`deliveryDateToday updated=${updated} date=${todayIso}`);

    return {
      date: todayIso,
      found: ids.length,
      updated,
      saleOrderIds: ids,
    };
  }
}