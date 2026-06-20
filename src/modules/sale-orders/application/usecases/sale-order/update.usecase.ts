import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY, SaleOrderItemRepository } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "src/modules/workflow/domain/ports/workflow.repository";
import { SALE_ORDER_STATE_HISTORY_REPOSITORY, SaleOrderStateHistoryRepository } from "src/modules/workflow/domain/ports/sale-order-state-history.repository";
import { WORKFLOW_TRANSITION_REPOSITORY, WorkflowTransitionRepository } from "src/modules/workflow/domain/ports/workflow-transition.repository";
import { ACTIONS } from "src/modules/workflow/domain/constants/workflow-action.constants";

type UpdateSaleOrderInput = {
  saleOrderId: string;
  workflowId?: string | null;
  warehouseId: string;
  clientId: string;
  agencyDetail?: string;
  sourceId?: string;
  scheduleDate?: string;
  deliveryDate?: string;
  note?: string;
  subTotal?: number;
  deliveryCost?: number;
  total?: number;
  items: Array<{
    quantity: number;
    unitPrice: number;
    total: number;
    description?: string;
    referencePackId?: string;
    components?: Array<{
      skuId: string;
      quantity: number;
      unitPrice: number;
      total: number;
      referencePackItemId?: string;
    }>;
  }>;
  payments?: Array<{
    bankAccountId?: string;
    method: string;
    amount: number;
    date?: string;
    operationNumber?: string;
    note?: string;
  }>;
};

type StockLifecycleStatus = "NONE" | "RESERVED" | "REVERTED" | "CONSUMED";

@Injectable()
export class UpdateSaleOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,

    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,

    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,

    @Inject(SALE_ORDER_ITEM_REPOSITORY)
    private readonly saleOrderItemRepo: SaleOrderItemRepository,

    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly componentRepo: SaleOrderItemComponentRepository,

    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,

    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo: SaleOrderStateHistoryRepository,

    @Inject(WORKFLOW_TRANSITION_REPOSITORY)
    private readonly transitionRepo: WorkflowTransitionRepository,

  ) {}

  private buildComponentSignature(
    components: Array<{ skuId: string; quantity: number }>,
  ): string {
    const quantityBySku = new Map<string, number>();
    for (const component of components) {
      quantityBySku.set(
        component.skuId,
        (quantityBySku.get(component.skuId) ?? 0) + Number(component.quantity ?? 0),
      );
    }
    return [...quantityBySku.entries()]
      .sort(([skuA], [skuB]) => skuA.localeCompare(skuB))
      .map(([skuId, quantity]) => `${skuId}:${quantity}`)
      .join("|");
  }

  private async resolveStockLifecycleStatus(
    saleOrderId: string,
    tx: TransactionContext,
  ): Promise<StockLifecycleStatus> {
    const history = await this.historyRepo.listBySaleOrderId(saleOrderId, tx);
    let status: StockLifecycleStatus = "NONE";
    for (const item of history) {
      if (!item.transitionId) continue;
      const detailed = await this.transitionRepo.findDetailedById(item.transitionId, tx);
      const actions = [...(detailed?.actions ?? [])].sort(
        (a, b) => a.position - b.position,
      );
      for (const action of actions) {
        if (action.type === ACTIONS.RESERVE_STOCK) {
          status = "RESERVED";
        } else if (action.type === ACTIONS.REVERT_STOCK) {
          status = "REVERTED";
        } else if (action.type === ACTIONS.CONSUME_STOCK) {
          status = "CONSUMED";
        }
      }
    }
    return status;
  }

  async execute(input: UpdateSaleOrderInput) {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);

      if (!order) {
        throw new BadRequestException("Pedido no encontrado");
      }

      const selectedWorkflowId = input.workflowId?.trim() || null;

      let workflowIdToSave = order.workflowId ?? null;
      let currentStateIdToSave = order.currentStateId ?? null;

      if (selectedWorkflowId) {
        const orderHasWorkflow = Boolean(order.workflowId || order.currentStateId);

        if (orderHasWorkflow && selectedWorkflowId !== order.workflowId) {
          throw new BadRequestException(
            "El pedido ya tiene flujo asignado. No debe cambiarlo",
          );
        }

        if (!orderHasWorkflow) {
          const resolved = await this.workflowRepo.findDetailedById(selectedWorkflowId, tx);
          const initialStates = resolved?.states.filter(
            (state) => state.isActive && state.isInitial,
          ) ?? [];

          if (!resolved?.workflow.isActive || initialStates.length !== 1) {
            throw new BadRequestException("flujo inválido para asignar al pedido");
          }

          const initialState = initialStates[0];

          workflowIdToSave = resolved.workflow.id;
          currentStateIdToSave = initialState.id;
        }
      }

      const existingItems = await this.saleOrderItemRepo.listBySaleOrderId(
        input.saleOrderId,
        tx,
      );

      const existingItemIds = existingItems.map((row) => row.id);

      if (!input.items?.length) {
        throw new BadRequestException("Items requeridos");
      }

      const componentPlansByItemIndex: Array<
        Array<{
          skuId: string;
          referencePackItemId?: string | null;
          quantity: number;
          unitPrice: number;
          total: number;
        }>
      > = [];

      for (const item of input.items) {
        const referencePackId = item.referencePackId?.trim();
        const requestedComponents = item.components ?? [];

        if (!requestedComponents.length && !referencePackId) {
          throw new BadRequestException("Cada item debe incluir components[] o referencePackId");
        }

        if (!referencePackId) {
          componentPlansByItemIndex.push(
            requestedComponents.map((component) => ({
              skuId: component.skuId,
              referencePackItemId: component.referencePackItemId ?? null,
              quantity: component.quantity,
              unitPrice: component.unitPrice,
              total: component.total,
            })),
          );
          continue;
        }

        const pack = await this.packRepo.findByIdWithItems(referencePackId, tx);

        if (!pack) {
          throw new BadRequestException("Pack inválido");
        }

        const overridesBySkuId = new Map(
          requestedComponents.map((component) => [
            component.skuId,
            {
              skuId: component.skuId,
              referencePackItemId: component.referencePackItemId ?? null,
              quantity: component.quantity,
              unitPrice: component.unitPrice,
              total: component.total,
            },
          ]),
        );

        const plans: Array<{
          skuId: string;
          referencePackItemId?: string | null;
          quantity: number;
          unitPrice: number;
          total: number;
        }> = [];

        for (const packItem of pack.items) {
          const override = overridesBySkuId.get(packItem.skuId);

          if (override) {
            plans.push({
              skuId: override.skuId,
              referencePackItemId: override.referencePackItemId ?? packItem.id,
              quantity: override.quantity,
              unitPrice: override.unitPrice,
              total: override.total,
            });

            overridesBySkuId.delete(packItem.skuId);
            continue;
          }

          plans.push({
            skuId: packItem.skuId,
            referencePackItemId: packItem.id,
            quantity: Number(item.quantity) * Number(packItem.quantity),
            unitPrice: Number(packItem.price ?? 0),
            total: Number(packItem.lineTotal ?? 0) * Number(item.quantity),
          });
        }

        if (overridesBySkuId.size) {
          throw new BadRequestException("Components contiene SKU(s) que no pertenecen al pack");
        }

        componentPlansByItemIndex.push(plans);
      }

      const stockLifecycleStatus = await this.resolveStockLifecycleStatus(
        input.saleOrderId,
        tx,
      );
      const warehouseChanged = input.warehouseId !== order.warehouseId;
      if (warehouseChanged && stockLifecycleStatus === "RESERVED") {
        throw new BadRequestException(
          "No se puede cambiar el almacén porque el pedido tiene stock reservado.",
        );
      }
      if (warehouseChanged && stockLifecycleStatus === "CONSUMED") {
        throw new BadRequestException(
          "No se puede cambiar el almacén porque el pedido ya consumió stock.",
        );
      }
      if (stockLifecycleStatus === "RESERVED") {
        const existingComponents = await this.componentRepo.listBySaleOrderItemIds(
          existingItemIds,
          tx,
        );
        const currentSignature = this.buildComponentSignature(
          existingComponents.map((component) => ({
            skuId: component.skuId,
            quantity: Number(component.quantity ?? 0),
          })),
        );
        const nextComponents = componentPlansByItemIndex.flat();
        const nextSignature = this.buildComponentSignature(
          nextComponents.map((component) => ({
            skuId: component.skuId,
            quantity: Number(component.quantity ?? 0),
          })),
        );
        if (currentSignature !== nextSignature) {
          throw new BadRequestException(
            "Este pedido ya tiene stock reservado. Para cambiar productos o cantidades, primero debes liberar la reserva del flujo.",
          );
        }
      }

      await this.componentRepo.deleteBySaleOrderItemIds(existingItemIds, tx);
      await this.saleOrderItemRepo.deleteBySaleOrderId(input.saleOrderId, tx);
      await this.paymentRepo.deleteBySaleOrderId(input.saleOrderId, tx);

      const updated = await this.saleOrderRepo.update(
        {
          saleOrderId: input.saleOrderId,

          workflowId: workflowIdToSave,
          currentStateId: currentStateIdToSave,

          warehouseId: input.warehouseId,
          clientId: input.clientId,
          agencyDetail: input.agencyDetail?.trim() ? input.agencyDetail.trim() : null,
          sourceId: input.sourceId?.trim() ? input.sourceId.trim() : null,
          scheduleDate: input.scheduleDate ?? null,
          deliveryDate: input.deliveryDate ?? null,
          subTotal: input.subTotal ?? 0,
          deliveryCost: input.deliveryCost ?? 0,
          total: input.total ?? 0,
          note: input.note ?? null,
        },
        tx,
      );

      const savedItems = await this.saleOrderItemRepo.bulkCreate(
        input.items.map((row) => ({
          saleOrderId: updated.id,
          referencePackId: row.referencePackId?.trim()
            ? row.referencePackId.trim()
            : null,
          description: row.description?.trim()
            ? row.description.trim()
            : null,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          total: row.total,
        })),
        tx,
      );

      const componentsToSave = savedItems.flatMap((savedItem, index) =>
        (componentPlansByItemIndex[index] ?? []).map((component) => ({
          saleOrderItemId: savedItem.id,
          skuId: component.skuId,
          referencePackItemId: component.referencePackItemId ?? null,
          quantity: component.quantity,
          unitPrice: component.unitPrice,
          total: component.total,
        })),
      );

      if (componentsToSave.length) {
        await this.componentRepo.bulkCreate(componentsToSave, tx);
      }

      const paymentsInput = (input.payments ?? []).map((payment) => {
        const date = payment.date ? new Date(payment.date) : new Date();

        if (Number.isNaN(date.getTime())) {
          throw new BadRequestException("Fecha de pago inválida");
        }

        return {
          saleOrderId: updated.id,
          bankAccountId: payment.bankAccountId?.trim()
            ? payment.bankAccountId.trim()
            : null,
          date,
          method: payment.method,
          operationNumber: payment.operationNumber ?? null,
          amount: payment.amount,
          note: payment.note ?? null,
        };
      });

      try {
        if (paymentsInput.length) {
          await this.paymentRepo.bulkCreate(paymentsInput, tx);
        }
      } catch (error: any) {
        if (error?.code === "23503") {
          throw new BadRequestException("Cuenta bancaria inválida");
        }

        throw error;
      }

      return {
        orderId: updated.id,
        serie: updated.serie ?? null,
        correlative: updated.correlative ?? null,
        workflowId: updated.workflowId ?? null,
        currentStateId: updated.currentStateId ?? null,
      };
    });
  }
}
