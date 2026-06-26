import { Inject, Injectable } from "@nestjs/common";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderStatisticsOutput } from "../dtos/sale-order-statistics.output";
import { SaleOrderGetOutput } from "../dtos/sale-order-search/output/sale-order-search-state.output";

export type SaleOrderRealtimePayloadInput = {
  updated?: number;
  saleOrderIds: string[];
  source: string;
  trigger?: string;
};

export type SaleOrderRealtimePayload = {
  updated: number;
  saleOrderIds: string[];
  source: string;
  trigger?: string;
  saleOrders?: SaleOrderGetOutput[];
  statistics?: SaleOrderStatisticsOutput;
};

@Injectable()
export class SaleOrderRealtimePayloadService {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  async build(input: SaleOrderRealtimePayloadInput): Promise<SaleOrderRealtimePayload> {
    const saleOrderIds = Array.from(new Set(input.saleOrderIds.filter(Boolean)));
    const [saleOrders, statistics] = await Promise.all([
      this.loadSaleOrders(saleOrderIds),
      this.loadStatistics(),
    ]);

    return {
      updated: input.updated ?? saleOrderIds.length,
      saleOrderIds,
      source: input.source,
      ...(input.trigger ? { trigger: input.trigger } : {}),
      ...(saleOrders.length ? { saleOrders } : {}),
      ...(statistics ? { statistics } : {}),
    };
  }

  private async loadSaleOrders(saleOrderIds: string[]) {
    const saleOrders = await Promise.all(
      saleOrderIds.map((saleOrderId) => this.saleOrderRepo.findById(saleOrderId).catch(() => null)),
    );

    return saleOrders.filter((saleOrder): saleOrder is SaleOrderGetOutput => Boolean(saleOrder));
  }

  private async loadStatistics() {
    return this.saleOrderRepo.statistics({ includeCancelled: true }).catch(() => undefined);
  }
}
