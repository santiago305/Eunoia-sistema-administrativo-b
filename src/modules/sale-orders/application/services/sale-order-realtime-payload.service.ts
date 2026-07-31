import { Inject, Injectable } from "@nestjs/common";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";

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
};

@Injectable()
export class SaleOrderRealtimePayloadService {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  async build(input: SaleOrderRealtimePayloadInput): Promise<SaleOrderRealtimePayload> {
    const saleOrderIds = Array.from(new Set(input.saleOrderIds.filter(Boolean)));
    return {
      updated: input.updated ?? saleOrderIds.length,
      saleOrderIds,
      source: input.source,
      ...(input.trigger ? { trigger: input.trigger } : {}),
    };
  }
}
