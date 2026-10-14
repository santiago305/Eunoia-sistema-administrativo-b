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
import { fromMinorUnits, toMinorUnits } from "src/modules/sale-orders/domain/value-objects/money";

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
    const totalPaidCents = payments.reduce((sumCents, payment) => {
      if (payment.status !== "POSTED") return sumCents;

      const nextCents = sumCents + toMinorUnits(payment.amount ?? 0);
      if (!Number.isSafeInteger(nextCents)) {
        throw new Error("El total pagado del pedido está fuera del rango permitido");
      }
      return nextCents;
    }, 0);
    const totalPaid = fromMinorUnits(totalPaidCents);
    const client = await this.clientRepo.findById(order.clientId, tx);

    const totalCents = toMinorUnits(order.total ?? 0);
    const total = fromMinorUnits(totalCents);

    return {
      orderId: order.id,
      isPaid: totalCents > 0 && totalPaidCents >= totalCents,
      hasStock: await this.hasAvailableStock(order, tx),
      isCancelled: currentState.code.toUpperCase() === "CANCELLED",
      invoiceSent: order.invoiceSend,
      currentDate: this.clock.now(),
      variables: {
        workflowId: order.workflowId,
        currentStateId: order.currentStateId,
        warehouseId: order.warehouseId,
        total,
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
        "client.departmentId": client?.departmentId ?? null,
        "client.provinceId": client?.provinceId ?? null,
        "client.districtId": client?.districtId ?? null,
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
