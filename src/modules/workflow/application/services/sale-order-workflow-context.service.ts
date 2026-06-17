import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "src/modules/product-catalog/domain/ports/inventory.repository";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { WorkflowContext } from "../../domain/conditions/condition";
import { WorkflowState } from "../../domain/entities/workflow-state";
import { SaleOrderStockRequirementsService } from "./sale-order-stock-requirements.service";

@Injectable()
export class SaleOrderWorkflowContextService {
  constructor(
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly stockRequirements: SaleOrderStockRequirementsService,
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
  ) {}

  async build(order: SaleOrder, currentState: WorkflowState, tx?: TransactionContext): Promise<WorkflowContext> {
    const payments = await this.paymentRepo.listBySaleOrderIds([order.id], tx);
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    const client = await this.clientRepo.findById(order.clientId, tx);

    return {
      orderId: order.id,
      isPaid: totalPaid >= Number(order.total ?? 0),
      hasStock: await this.hasAvailableStock(order, tx),
      isCancelled: currentState.code.toUpperCase() === "CANCELLED",
      invoiceSent: order.invoiceSend,
      currentDate: this.clock.now(),
      variables: {
        workflowId: order.workflowId,
        currentStateId: order.currentStateId,
        warehouseId: order.warehouseId,
        total: Number(order.total ?? 0),
        totalPaid,
        deliveryDate: order.deliveryDate,
        scheduleDate: order.scheduleDate,
        sourceId: order.sourceId,
        agencyDetail: order.agencyDetail,
        note: order.note,
        "client.docNumber": client?.docNumber ?? null,
        "client.address": client?.address ?? null,
        "client.reference": client?.reference ?? null,
        "client.docType": client?.docType ?? null,
      },
    };
  }

  private async hasAvailableStock(order: SaleOrder, tx?: TransactionContext): Promise<boolean> {
    if (!order.warehouseId) {
      return false;
    }

    const requirements = await this.stockRequirements.resolve(order, tx);
    if (!requirements.length) {
      return false;
    }

    for (const { stockItemId, quantity } of requirements) {
      const snapshot = await this.inventoryRepo.getSnapshot(
        { warehouseId: order.warehouseId, stockItemId, locationId: null },
        tx,
      );
      if (!snapshot || Number(snapshot.onHand ?? 0) - Number(snapshot.reserved ?? 0) < quantity) {
        return false;
      }
    }

    return true;
  }
}
