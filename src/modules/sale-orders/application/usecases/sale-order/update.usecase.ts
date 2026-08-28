import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import {
  TransactionContext,
  UNIT_OF_WORK,
  UnitOfWork,
} from 'src/shared/domain/ports/unit-of-work.port';
import {
  PACK_REPOSITORY,
  PackRepository,
} from 'src/modules/packs/domain/ports/pack.repository';
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order.repository';
import {
  SALE_ORDER_ITEM_REPOSITORY,
  SaleOrderItemRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order-item.repository';
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order-item-component.repository';
import {
  SALE_PAYMENT_REPOSITORY,
  SalePaymentRepository,
} from 'src/modules/sale-orders/domain/ports/sale-payment.repository';
import {
  WORKFLOW_REPOSITORY,
  WorkflowRepository,
} from 'src/modules/workflow/domain/ports/workflow.repository';
import { AdviserMembershipService } from '../../services/adviser-membership.service';
import { SaleOrderEditPolicyService } from '../../services/sale-order-edit-policy.service';
import { ReconcileLogisticsPayableForSaleOrderUsecase } from 'src/modules/logistics-payables/application/usecases/reconcile-logistics-payable-for-sale-order.usecase';
import { SaleOrderCommandAuthorizationService } from '../../services/sale-order-command-authorization.service';
import {
  SaleOrderSuppliesService,
  SaleOrderSupplyInput,
} from '../../services/sale-order-supplies.service';
import { SaleOrderPaymentWorkflowReconciliationService } from '../../services/sale-order-payment-workflow-reconciliation.service';
import { SaleOrderStockCorrectionService } from '../../services/sale-order-stock-correction.service';
import {
  SALE_ORDER_STATE_HISTORY_REPOSITORY,
  SaleOrderStateHistoryRepository,
} from 'src/modules/workflow/domain/ports/sale-order-state-history.repository';
import { SaleOrderStateHistory } from 'src/modules/workflow/domain/entities/sale-order-state-history';
import { CLOCK, ClockPort } from 'src/shared/application/ports/clock.port';
import { randomUUID } from 'crypto';

export type UpdateSaleOrderInput = {
  saleOrderId: string;
  userId?: string;
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
    packNameSnapshot?: string | null;
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
  supplies?: SaleOrderSupplyInput[];
};

type UpdateSaleOrderTransactionOptions = {
  deferPaymentWorkflowReconciliation?: boolean;
  executedBy?: string;
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
    @Optional()
    private readonly reconcileLogisticsPayable?: ReconcileLogisticsPayableForSaleOrderUsecase,
    @Optional()
    private readonly commandAuthorization?: SaleOrderCommandAuthorizationService,
    @Optional() private readonly suppliesService?: SaleOrderSuppliesService,
    @Optional()
    private readonly paymentWorkflowReconciliation?: SaleOrderPaymentWorkflowReconciliationService,
    @Optional()
    private readonly stockCorrection?: SaleOrderStockCorrectionService,
    @Optional()
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo?: SaleOrderStateHistoryRepository,
    @Optional()
    @Inject(CLOCK)
    private readonly clock?: ClockPort,
  ) {}

  private buildComponentSignature(
    components: Array<{ skuId: string; quantity: number }>,
  ): string {
    const quantityBySku = new Map<string, number>();
    for (const component of components) {
      quantityBySku.set(
        component.skuId,
        (quantityBySku.get(component.skuId) ?? 0) +
          Number(component.quantity ?? 0),
      );
    }
    return [...quantityBySku.entries()]
      .sort(([skuA], [skuB]) => skuA.localeCompare(skuB))
      .map(([skuId, quantity]) => `${skuId}:${quantity}`)
      .join('|');
  }

  private buildSupplySignature(
    supplies: Array<{ supplySkuId: string; quantity: number; unitId: string }>,
  ): string {
    return supplies
      .map((supply) => ({
        supplySkuId: supply.supplySkuId,
        quantity: Number(supply.quantity ?? 0),
        unitId: supply.unitId,
      }))
      .sort((a, b) => a.supplySkuId.localeCompare(b.supplySkuId))
      .map(
        (supply) => `${supply.supplySkuId}:${supply.unitId}:${supply.quantity}`,
      )
      .join('|');
  }

  private buildCommercialItemSignature(
    items: Array<{
      referencePackId?: string | null;
      packNameSnapshot?: string | null;
      description?: string | null;
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
      .map((item) =>
        JSON.stringify({
          referencePackId: item.referencePackId?.trim() || null,
          packNameSnapshot: item.packNameSnapshot?.trim() || null,
          description: item.description?.trim() || null,
          quantity: Number(item.quantity ?? 0),
          unitPrice: Number(item.unitPrice ?? 0),
          total: Number(item.total ?? 0),
          components: item.components
            .map((component) => ({
              skuId: component.skuId,
              referencePackItemId:
                component.referencePackItemId?.trim() || null,
              quantity: Number(component.quantity ?? 0),
              unitPrice: Number(component.unitPrice ?? 0),
              total: Number(component.total ?? 0),
            }))
            .sort((left, right) =>
              JSON.stringify(left).localeCompare(JSON.stringify(right)),
            ),
        }),
      )
      .sort()
      .join('|');
  }

  private moneyChanged(
    left: number | null | undefined,
    right: number,
  ): boolean {
    return (
      Math.round(Number(left ?? 0) * 100) !== Math.round(Number(right) * 100)
    );
  }

  async execute(input: UpdateSaleOrderInput) {
    if (input.userId) {
      await this.commandAuthorization?.authorizeUpdate(
        input.userId,
        input as any,
      );
    }
    return this.uow.runInTransaction((tx) =>
      this.executeInTransaction(input, tx, { executedBy: input.userId }),
    );
  }

  async executeInTransaction(
    input: UpdateSaleOrderInput,
    tx: TransactionContext,
    options: UpdateSaleOrderTransactionOptions = {},
  ) {
    await this.adviserMembership?.assertIsAdviser(input.assignedBy);
    const order = await this.saleOrderRepo.findByIdForUpdate(
      input.saleOrderId,
      tx,
    );

    if (!order) {
      throw new BadRequestException('Pedido no encontrado');
    }

    const editPolicy = await this.editPolicy.resolve(order, tx);

    const selectedWorkflowId = input.workflowId?.trim() || null;

    let workflowIdToSave = order.workflowId ?? null;
    let currentStateIdToSave = order.currentStateId ?? null;
    const workflowChanged = Boolean(
      selectedWorkflowId && selectedWorkflowId !== order.workflowId,
    );

    if (selectedWorkflowId && workflowChanged) {
      const resolved = await this.workflowRepo.findDetailedById(
        selectedWorkflowId,
        tx,
      );
      const initialStates =
        resolved?.states.filter((state) => state.isActive && state.isInitial) ??
        [];

      if (!resolved?.workflow.isActive || initialStates.length !== 1) {
        throw new BadRequestException('flujo inválido para asignar al pedido');
      }

      const initialState = initialStates[0];

      workflowIdToSave = resolved.workflow.id;
      currentStateIdToSave = initialState.id;
    }

    const existingItems = await this.saleOrderItemRepo.listBySaleOrderId(
      input.saleOrderId,
      tx,
    );

    const existingItemIds = existingItems.map((row) => row.id);

    if (!input.items?.length) {
      throw new BadRequestException('Items requeridos');
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
        throw new BadRequestException(
          'Cada item debe incluir components[] o referencePackId',
        );
      }

      if (requestedComponents.length) {
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

      if (!pack || pack.pack?.isActive === false) {
        throw new BadRequestException('Pack inválido');
      }

      const plans: Array<{
        skuId: string;
        referencePackItemId?: string | null;
        quantity: number;
        unitPrice: number;
        total: number;
      }> = [];

      for (const packItem of pack.items) {
        plans.push({
          skuId: packItem.skuId,
          referencePackItemId: packItem.id,
          quantity: Number(item.quantity) * Number(packItem.quantity),
          unitPrice: Number(packItem.price ?? 0),
          total: Number(packItem.lineTotal ?? 0) * Number(item.quantity),
        });
      }

      componentPlansByItemIndex.push(plans);
    }

    const existingComponents = await this.componentRepo.listBySaleOrderItemIds(
      existingItemIds,
      tx,
    );
    const nextComponents = componentPlansByItemIndex.flat();
    const stockCompositionChanged =
      this.buildComponentSignature(
        existingComponents.map((component) => ({
          skuId: component.skuId,
          quantity: Number(component.quantity ?? 0),
        })),
      ) !==
      this.buildComponentSignature(
        nextComponents.map((component) => ({
          skuId: component.skuId,
          quantity: Number(component.quantity ?? 0),
        })),
      );
    const commercialItemsChanged =
      this.buildCommercialItemSignature(
        existingItems.map((item) => ({
          referencePackId: item.referencePackId,
          packNameSnapshot: item.packNameSnapshot,
          description: item.description,
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
      ) !==
      this.buildCommercialItemSignature(
        input.items.map((item, index) => ({
          referencePackId: item.referencePackId,
          packNameSnapshot: item.packNameSnapshot,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          components: componentPlansByItemIndex[index] ?? [],
        })),
      );
    const subTotal = input.items.reduce(
      (sum, item) => sum + Number(item.total ?? 0),
      0,
    );
    const deliveryCost = Number(input.deliveryCost ?? 0);
    const discount = Number(input.discount ?? order.discount ?? 0);
    const total = Math.max(0, subTotal + deliveryCost - discount);

    const stockLifecycleStatus = editPolicy.stockStatus;
    const isAdvancedOrder =
      editPolicy.isFinal ||
      stockLifecycleStatus === 'RESERVED' ||
      stockLifecycleStatus === 'CONSUMED';
    const warehouseChanged = input.warehouseId !== order.warehouseId;

    let suppliesChanged = false;
    if (
      input.supplies !== undefined &&
      this.suppliesService &&
      isAdvancedOrder
    ) {
      const currentSupplies = await this.suppliesService.listBySaleOrderId(
        input.saleOrderId,
        tx,
      );
      suppliesChanged =
        this.buildSupplySignature(currentSupplies) !==
        this.buildSupplySignature(input.supplies);
    }

    const amountChanged =
      this.moneyChanged(order.subTotal, subTotal) ||
      this.moneyChanged(order.deliveryCost, deliveryCost) ||
      this.moneyChanged(order.discount, discount) ||
      this.moneyChanged(order.total, total);
    const previousDeliveryDate = order.deliveryDate ?? null;
    const currentDeliveryDate = input.deliveryDate ?? null;
    const deliveryDateChanged = previousDeliveryDate !== currentDeliveryDate;
    const advancedCorrectionRequested =
      isAdvancedOrder &&
      (commercialItemsChanged ||
        suppliesChanged ||
        amountChanged ||
        deliveryDateChanged ||
        workflowChanged ||
        warehouseChanged);
    const executedBy = options.executedBy ?? input.userId ?? null;
    if (advancedCorrectionRequested && this.commandAuthorization) {
      if (!executedBy) {
        throw new BadRequestException(
          'No se pudo validar el permiso Pedidos avanzados',
        );
      }
      await this.commandAuthorization.authorizeAdvancedOrder(executedBy);
    }

    let activeStockCompositionReleased = false;
    if (
      (stockLifecycleStatus === 'RESERVED' ||
        stockLifecycleStatus === 'CONSUMED') &&
      (stockCompositionChanged ||
        suppliesChanged ||
        workflowChanged ||
        warehouseChanged)
    ) {
      const stockActor = executedBy ?? order.createdBy ?? null;
      if (!this.stockCorrection || !stockActor) {
        throw new BadRequestException(
          'No se pudo iniciar la corrección segura del inventario',
        );
      }
      activeStockCompositionReleased =
        await this.stockCorrection.releasePreviousComposition(
          order,
          stockLifecycleStatus,
          stockActor,
          tx,
        );
    }

    await this.componentRepo.deleteBySaleOrderItemIds(existingItemIds, tx);
    await this.saleOrderItemRepo.deleteBySaleOrderId(input.saleOrderId, tx);

    if (input.payments) {
      await this.paymentRepo.deleteBySaleOrderId(input.saleOrderId, tx);
    }

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
        packNameSnapshot: row.packNameSnapshot,
        description: row.description?.trim() ? row.description.trim() : null,
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

    if (this.suppliesService) {
      if (input.supplies !== undefined) {
        await this.suppliesService.replace(updated.id, input.supplies, tx);
      } else if (workflowChanged && workflowIdToSave) {
        await this.suppliesService.copyFromWorkflowRecipe(
          updated.id,
          workflowIdToSave,
          tx,
        );
      }
    }

    if (activeStockCompositionReleased && !workflowChanged) {
      await this.stockCorrection!.reserveCorrectedComposition(updated, tx);
    }

    const paymentsInput = (input.payments ?? []).map((payment) => {
      const date = payment.date ? new Date(payment.date) : new Date();

      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Fecha de pago inválida');
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
      if (error?.code === '23503') {
        throw new BadRequestException('Cuenta bancaria inválida');
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

    const totalChanged =
      Math.round(Number(order.total ?? 0) * 100) !==
      Math.round(Number(total) * 100);
    let reconciledCurrentStateId = updated.currentStateId ?? null;
    let paymentStateChanged = false;
    if (
      !options.deferPaymentWorkflowReconciliation &&
      options.executedBy &&
      this.paymentWorkflowReconciliation &&
      !workflowChanged &&
      (totalChanged ||
        deliveryDateChanged ||
        input.payments !== undefined ||
        activeStockCompositionReleased)
    ) {
      const reconciliation = await this.paymentWorkflowReconciliation.reconcile(
        {
          saleOrderId: updated.id,
          executedBy: options.executedBy,
          source: 'sale-order-standard-save',
          previousTotal: Number(order.total ?? 0),
          currentTotal: total,
          ...(deliveryDateChanged
            ? { previousDeliveryDate, currentDeliveryDate }
            : {}),
        },
        tx,
      );
      reconciledCurrentStateId =
        reconciliation?.currentState?.id ?? reconciledCurrentStateId;
      paymentStateChanged = reconciliation?.stateChanged ?? false;
    }

    if (
      activeStockCompositionReleased &&
      stockLifecycleStatus === 'CONSUMED' &&
      !workflowChanged &&
      !options.deferPaymentWorkflowReconciliation &&
      !paymentStateChanged
    ) {
      await this.stockCorrection!.consumeCorrectedComposition(updated, tx);
    }

    if (
      (workflowChanged || warehouseChanged) &&
      this.historyRepo &&
      updated.workflowId &&
      updated.currentStateId
    ) {
      await this.historyRepo.append(
        new SaleOrderStateHistory({
          id: randomUUID(),
          saleOrderId: updated.id,
          workflowId: updated.workflowId,
          transitionId: null,
          fromStateId: order.currentStateId ?? null,
          toStateId: updated.currentStateId,
          executedBy,
          executedAt: this.clock?.now() ?? new Date(),
          metadata: {
            source: 'advanced-order-reassignment',
            previousWorkflowId: order.workflowId ?? null,
            workflowId: updated.workflowId,
            previousStateId: order.currentStateId ?? null,
            stateId: updated.currentStateId,
            previousWarehouseId: order.warehouseId ?? null,
            warehouseId: updated.warehouseId ?? null,
            previousStockStatus: stockLifecycleStatus,
            workflowChanged,
            warehouseChanged,
            ...(workflowChanged ? { stockStatus: 'NONE' } : {}),
          },
        }),
        tx,
      );
    }

    return {
      orderId: updated.id,
      serie: updated.serie ?? null,
      correlative: updated.correlative ?? null,
      workflowId: updated.workflowId ?? null,
      currentStateId: reconciledCurrentStateId,
      previousTotal: Number(order.total ?? 0),
      totalChanged,
      previousDeliveryDate,
      deliveryDate: currentDeliveryDate,
      deliveryDateChanged,
      stockCompositionReplaced: activeStockCompositionReleased,
      previousStockStatus: stockLifecycleStatus,
      workflowChanged,
      warehouseChanged,
      previousWorkflowId: order.workflowId ?? null,
      previousWarehouseId: order.warehouseId ?? null,
    };
  }
}
