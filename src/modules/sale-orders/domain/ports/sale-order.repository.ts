import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { AgendaStatus } from "../value-objects/agenda-status";
import { DeliveryStatus } from "../value-objects/delivery-status";
import { DeliveryType } from "../value-objects/delivery-type";
import { SaleOrder } from "../entities/sale-order";
import {
  SaleOrderListItemOutput,
  SaleOrderSearchRule,
} from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";
import { SaleOrderGetOutput } from "../../application/dtos/sale-order-search/output/sale-order-search-state.output";

export const SALE_ORDER_REPOSITORY = Symbol("SALE_ORDER_REPOSITORY");

export interface SaleOrderRepository {
  create(
    input: {
      serie: string | null;
      correlative: number | null;
      warehouseId: string | null;
      clientId: string;
      agencyDetail?: string | null;
      sourceId?: string | null;
      scheduleDate?: string | null;
      deliveryDate?: string | null;
      deliveryType?: DeliveryType | null;
      subTotal: number;
      deliveryCost: number;
      total: number;
      note?: string | null;
      createdBy: string;
      agendaStatus: AgendaStatus;
      deliveryStatus?: DeliveryStatus | null;
      isActive?: boolean;
    },
    tx?: TransactionContext,
  ): Promise<SaleOrder>;

  findByIdForUpdate(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrder | null>;

  update(
    input: {
      saleOrderId: string;
      warehouseId: string | null;
      clientId: string;
      agencyDetail?: string | null;
      sourceId?: string | null;
      scheduleDate?: string | null;
      deliveryDate?: string | null;
      deliveryType?: DeliveryType | null;
      subTotal: number;
      deliveryCost: number;
      total: number;
      note?: string | null;
    },
    tx?: TransactionContext,
  ): Promise<SaleOrder>;

  listIdsToProgramForDeliveryDate(
    input: { deliveryDate: string; limit?: number },
    tx?: TransactionContext,
  ): Promise<string[]>;

  list(
    params: { q?: string; filters?: SaleOrderSearchRule[]; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: SaleOrderListItemOutput[]; total: number }>;
  findById(saleOrderId: string): Promise<SaleOrderGetOutput | null>;
  updateStatuses(
    input: {
      saleOrderId: string;
      agendaStatus?: AgendaStatus;
      deliveryStatus?: DeliveryStatus | null;
    },
    tx?: TransactionContext,
  ): Promise<SaleOrder>;
  countSaleOrdersByClientId(clientId: string, tx?: TransactionContext): Promise<number>;
} 
