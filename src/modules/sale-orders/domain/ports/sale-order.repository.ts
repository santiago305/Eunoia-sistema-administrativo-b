import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { AgendaStatus } from "../value-objects/agenda-status";
import { DeliveryStatus } from "../value-objects/delivery-status";
import { DeliveryType } from "../value-objects/delivery-type";
import { SaleOrder } from "../entities/sale-order";

export const SALE_ORDER_REPOSITORY = Symbol("SALE_ORDER_REPOSITORY");

export interface SaleOrderRepository {
  create(
    input: {
      serie: string | null;
      correlative: number | null;
      warehouseId: string;
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
}
