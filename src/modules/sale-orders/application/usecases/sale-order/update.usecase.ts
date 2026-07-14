import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
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
import { AdviserMembershipService } from "../../services/adviser-membership.service";
import { SaleOrderEditPolicyService } from "../../services/sale-order-edit-policy.service";
import { ReconcileLogisticsPayableForSaleOrderUsecase } from "src/modules/logistics-payables/application/usecases/reconcile-logistics-payable-for-sale-order.usecase";

export type UpdateSaleOrderInput = {
  saleOrderId: string;
  workflowId?: string | null;
  warehouseId: string;
  clientId: string;
  agencySubsidiaryId?: string;
  agencyDetail?: string | null;
  sourceId?: string;
  scheduleDate?: string;
  deliveryDate?: string;
  note?: string;
  advertisingCode?: string | null;
  observation?: string | null;
  sendDate?: string | null;
  sendPhoto?: string | null;
  sendCode?: string | null;
  sendAddress?: string | null;
  assignedBy?: string | null;
  subTotal?: number;
  deliveryCost?: number;
  logisticsCost?: number;
  discount?: number;
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
    paymentPhoto?: string | null;
  }>;
};

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
    private readonly editPolicy: SaleOrderEditPolicyService,
    @Optional() private readonly adviserMembership?: AdviserMembershipService,
    @Optional() private readonly reconcileLogisticsPayable?: ReconcileLogisticsPayableForSaleOrderUsecase,
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

  private buildCommercialItemSignature(
    items: Array<{
      referencePackId?: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
      components: Array<{
        skuId: string;
        referencePackItemId?: string | null;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
    }>,
  ): string {
    return items
      .map((item) => JSON.stringify({
        referencePackId: item.referencePackId ?? null,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        components: item.components
          .map((component) => ({
            skuId: component.skuId,
            referencePackItemId: component.referencePackItemId ?? null,
            quantity: Number(component.quantity),
            unitPrice: Number(component.unitPrice),
            total: Number(component.total),
          }))
          .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
      }))
      .sort()
      .join("|");
  }

  async execute(input: UpdateSaleOrderInput) {
    return this.uow.runInTransaction((tx) =>
      this.executeInTransaction(input, tx),
    );
  }

  async executeInTransaction(
    input: UpdateSaleOrderInput,
    tx: TransactionContext,
  ) {
      await this.adviserMembership?.assertIsAdviser(input.assignedBy);
      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);

      if (!order) {
        throw new BadRequestException("Pedido no encontrado");
      }

      const editPolicy = await this.editPolicy.resolve(order, tx);

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

        for (const extra of overridesBySkuId.values()) {
          plans.push({
            skuId: extra.skuId,
            referencePackItemId: null,
            quantity: extra.quantity,
            unitPrice: extra.unitPrice,
            total: extra.total,
          });
        }

        componentPlansByItemIndex.push(plans);
      }

      if (editPolicy.isFinal) {
        const existingComponents = await this.componentRepo.listBySaleOrderItemIds(
          existingItemIds,
          tx,
        );
        const currentSignature = this.buildCommercialItemSignature(
          existingItems.map((item) => ({
            referencePackId: item.referencePackId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            components: existingComponents
              .filter((component) => component.saleOrderItemId === item.id)
              .map((component) => ({
                skuId: component.skuId,
                referencePackItemId: component.referencePackItemId,
                quantity: component.quantity,
                unitPrice: component.unitPrice,
                total: component.total,
              })),
          })),
        );
        const nextSignature = this.buildCommercialItemSignature(
          input.items.map((item, index) => ({
            referencePackId: item.referencePackId ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            components: componentPlansByItemIndex[index] ?? [],
          })),
        );

        if (input.warehouseId !== order.warehouseId || currentSignature !== nextSignature) {
          throw new BadRequestException(
            "No se pueden cambiar productos, packs, cantidades, precios ni almacén de un pedido finalizado.",
          );
        }
      }

      const stockLifecycleStatus = editPolicy.stockStatus;
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

      if (input.payments) {
        await this.paymentRepo.deleteBySaleOrderId(input.saleOrderId, tx);
      }

      const subTotal = input.items.reduce(
        (sum, item) => sum + Number(item.total ?? 0),
        0,
      );
      const deliveryCost = Number(input.deliveryCost ?? 0);
      const discount = Number(input.discount ?? order.discount ?? 0);
      const total = Math.max(0, subTotal + deliveryCost - discount);

      const updated = await this.saleOrderRepo.update(
        {
          saleOrderId: input.saleOrderId,

          workflowId: workflowIdToSave,
          currentStateId: currentStateIdToSave,

          warehouseId: input.warehouseId,
          clientId: input.clientId,
          agencySubsidiaryId: input.agencySubsidiaryId ?? null,
          agencyDetail: input.agencyDetail ?? null,
          sourceId: input.sourceId?.trim() ? input.sourceId.trim() : null,
          scheduleDate: input.scheduleDate ?? null,
          deliveryDate: input.deliveryDate ?? null,
          subTotal,
          deliveryCost,
          discount,
          total,
          note: input.note ?? null,
          advertisingCode: input.advertisingCode ?? null,
          observation: input.observation ?? null,
          sendDate: input.sendDate ? new Date(input.sendDate) : null,
          sendPhoto: input.sendPhoto ?? null,
          sendCode: input.sendCode ?? null,
          sendAddress: input.sendAddress ?? null,
          assignedBy: input.assignedBy ?? null,
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
          paymentPhoto: payment.paymentPhoto ?? null,
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

      await this.reconcileLogisticsPayable?.execute(
        {
          saleOrderId: updated.id,
          serie: updated.serie ?? null,
          correlative: updated.correlative ?? null,
          agencySubsidiaryId: updated.agencySubsidiaryId ?? null,
          deliveryCost: Number(input.logisticsCost ?? updated.deliveryCost),
          deliveryDate: updated.deliveryDate ?? null,
          scheduleDate: updated.scheduleDate ?? null,
        },
        tx,
      );

      return {
        orderId: updated.id,
        serie: updated.serie ?? null,
        correlative: updated.correlative ?? null,
        workflowId: updated.workflowId ?? null,
        currentStateId: updated.currentStateId ?? null,
      };
  }
}
