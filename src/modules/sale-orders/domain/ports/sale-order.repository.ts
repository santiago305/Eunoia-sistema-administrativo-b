import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrder } from "../entities/sale-order";
import {
  SaleOrderListItemOutput,
  SaleOrderSearchRule,
} from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";
import { SaleOrderGetOutput } from "../../application/dtos/sale-order-search/output/sale-order-search-state.output";
import { SaleOrderStatisticsOutput } from "../../application/dtos/sale-order-statistics.output";

export const SALE_ORDER_REPOSITORY = Symbol("SALE_ORDER_REPOSITORY");

type SaleOrderWrite = {
  warehouseId: string | null;
  clientId: string;
  agencySubsidiaryId?: string | null;
  agencyDetail?: string | null;
  sourceId?: string | null;
  scheduleDate?: string | null;
  deliveryDate?: string | null;
  subTotal: number;
  deliveryCost: number;
  discount?: number;
  total: number;
  note?: string | null;
  advertisingCode?: string | null;
  observation?: string | null;
  sendDate?: Date | null;
  sendPhoto?: string | null;
  sendCode?: string | null;
  sendAddress?: string | null;
  assignedBy?: string | null;
  workflowId?: string | null;
  currentStateId?: string | null;
};

export interface SaleOrderRepository {
  create(
    input: SaleOrderWrite & {
      serie: string | null;
      correlative: number | null;
      createdBy: string;
      createdAt?: Date | null;
      isActive?: boolean;
    },
    tx?: TransactionContext,
  ): Promise<SaleOrder>;
  findByIdForUpdate(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrder | null>;
  assignWarehouseIfEmpty(
    input: { saleOrderId: string; warehouseId: string },
    tx?: TransactionContext,
  ): Promise<SaleOrder | null>;
  updateAssignedBy(
    input: { saleOrderId: string; assignedBy: string | null },
    tx?: TransactionContext,
  ): Promise<SaleOrder | null>;
  update(input: SaleOrderWrite & { saleOrderId: string }, tx?: TransactionContext): Promise<SaleOrder>;
  listIdsForAutomaticWorkflow(limit?: number, tx?: TransactionContext): Promise<string[]>;
  listIdsForAutomaticWorkflowByClientId(clientId: string, limit?: number, tx?: TransactionContext): Promise<string[]>;
  listIdsForAutomaticWorkflowByInventoryStockEvent(
    input: { warehouseId: string; stockItemId: string },
    limit?: number,
    tx?: TransactionContext,
  ): Promise<string[]>;
  list(
    params: { q?: string; filters?: SaleOrderSearchRule[]; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: SaleOrderListItemOutput[]; total: number }>;
  statistics(
    params: { q?: string; filters?: SaleOrderSearchRule[]; includeCancelled?: boolean },
    tx?: TransactionContext,
  ): Promise<SaleOrderStatisticsOutput>;
  findById(saleOrderId: string): Promise<SaleOrderGetOutput | null>;
  updateWorkflowState(
    input: {
      saleOrderId: string;
      workflowId?: string | null;
      currentStateId?: string | null;
    },
    tx?: TransactionContext,
  ): Promise<SaleOrder>;
  countSaleOrdersByClientId(clientId: string, tx?: TransactionContext): Promise<number>;
  markInvoiceSent(saleOrderId: string, tx?: TransactionContext): Promise<void>;
  setReserveBool(input: { saleOrderId: string; reserveBool: boolean }, tx?: TransactionContext): Promise<void>;
}
