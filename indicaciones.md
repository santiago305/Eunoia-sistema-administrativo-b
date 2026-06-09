caso update "import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_ITEM_REPOSITORY, SaleOrderItemRepository } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "src/modules/workflow/domain/ports/workflow.repository";

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
  ) {}

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
            "El pedido ya tiene workflow asignado. Cambia el estado desde las transiciones del workflow.",
          );
        }

        if (!orderHasWorkflow) {
          const resolved = await this.workflowRepo.findDetailedById(selectedWorkflowId, tx);
          const initialStates = resolved?.states.filter(
            (state) => state.isActive && state.isInitial,
          ) ?? [];

          if (!resolved?.workflow.isActive || initialStates.length !== 1) {
            throw new BadRequestException("Workflow inválido para asignar al pedido");
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
}"
"import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "src/modules/product-catalog/domain/ports/inventory.repository";
import {
  INVENTORY_LOCK,
  InventoryLock,
} from "src/modules/product-catalog/integration/inventory/ports/inventory-lock.port";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { WorkflowAction } from "../../domain/entities/workflow-action";
import { SaleOrderStockRequirementsService } from "./sale-order-stock-requirements.service";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { ACTIONS } from "../../domain/constants/workflow-action.constants";

@Injectable()
export class SaleOrderWorkflowActionRunnerService {
  constructor(
    private readonly requirements: SaleOrderStockRequirementsService,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(INVENTORY_LOCK)
    private readonly inventoryLock: InventoryLock,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  async run(order: SaleOrder, actions: WorkflowAction[], tx: TransactionContext): Promise<void> {
    if (!actions.length) return;
    const ordered = [...actions].sort((a, b) => a.position - b.position);
    const stockActions = ordered.filter((action) =>
      [
        ACTIONS.RESERVE_STOCK,
        ACTIONS.CONSUME_STOCK,
        ACTIONS.REVERT_STOCK,
      ].includes(action.type as any),
    );

    if (!stockActions.length) {
      for (const action of ordered) {
        if (action.type === ACTIONS.MARK_INVOICE_SENT) {
          await this.saleOrderRepo.markInvoiceSent(order.id, tx);
        }
      }
      return;
    }

    const onlyRevertsStock = stockActions.every((action) => action.type === ACTIONS.REVERT_STOCK);
    if (!order.warehouseId && onlyRevertsStock) {
      return;
    }
    if (!order.warehouseId) {
      throw new BadRequestException("El pedido no tiene almacen para ejecutar acciones de stock");
    }

    const requirements = await this.requirements.resolve(order, tx);
    const keys = requirements
      .map(({ stockItemId }) => ({ warehouseId: order.warehouseId!, stockItemId }))
      .sort((a, b) => `${a.warehouseId}:${a.stockItemId}`.localeCompare(`${b.warehouseId}:${b.stockItemId}`));
    if (keys.length) {
      await this.inventoryLock.lockSnapshots(keys, tx);
    }

    const snapshots = new Map<string, { onHand: number; reserved: number; available: number }>();
    for (const requirement of requirements) {
      const snapshot = await this.inventoryRepo.getSnapshot(
        { warehouseId: order.warehouseId, stockItemId: requirement.stockItemId, locationId: null },
        tx,
      );
      if (!snapshot) {
        if (onlyRevertsStock) {
          continue;
        }
        throw new BadRequestException("Stock no encontrado");
      }
      snapshots.set(requirement.stockItemId, {
        onHand: Number(snapshot.onHand ?? 0),
        reserved: Number(snapshot.reserved ?? 0),
        available: Number(snapshot.available ?? snapshot.onHand - snapshot.reserved),
      });
    }

    const quantitiesByAction = new Map<WorkflowAction, Map<string, number>>();
    for (const action of stockActions) {
      const quantities = new Map<string, number>();
      quantitiesByAction.set(action, quantities);
      for (const { stockItemId, quantity } of requirements) {
        const snapshot = snapshots.get(stockItemId);
        if (!snapshot) {
          quantities.set(stockItemId, 0);
          continue;
        }
        if (action.type === ACTIONS.RESERVE_STOCK && snapshot.available < quantity) {
          throw new BadRequestException("Stock disponible insuficiente");
        }
        if (action.type === ACTIONS.CONSUME_STOCK && snapshot.reserved < quantity) {
          throw new BadRequestException("Stock reservado insuficiente");
        }
        if (action.type === ACTIONS.CONSUME_STOCK && snapshot.onHand < quantity) {
          throw new BadRequestException("Stock fisico insuficiente");
        }

        const quantityToApply =
          action.type === ACTIONS.REVERT_STOCK ? Math.min(snapshot.reserved, quantity) : quantity;
        quantities.set(stockItemId, quantityToApply);
        if (action.type === ACTIONS.RESERVE_STOCK) {
          snapshot.reserved += quantityToApply;
          snapshot.available -= quantityToApply;
        } else if (action.type === ACTIONS.CONSUME_STOCK) {
          snapshot.reserved -= quantityToApply;
          snapshot.onHand -= quantityToApply;
        } else {
          snapshot.reserved -= quantityToApply;
          snapshot.available += quantityToApply;
        }
      }
    }

    for (const action of ordered) {
      if (action.type === ACTIONS.MARK_INVOICE_SENT) {
        await this.saleOrderRepo.markInvoiceSent(order.id, tx);
        continue;
      }
      for (const { stockItemId, quantity } of requirements) {
        const quantityToApply = quantitiesByAction.get(action)?.get(stockItemId) ?? quantity;
        if (quantityToApply === 0) {
          continue;
        }
        const base = { warehouseId: order.warehouseId, stockItemId, locationId: null };
        const reservedDelta = action.type === ACTIONS.RESERVE_STOCK ? quantityToApply : -quantityToApply;
        await this.inventoryRepo.incrementReserved({ ...base, delta: reservedDelta }, tx);
        if (action.type === ACTIONS.CONSUME_STOCK) {
          await this.inventoryRepo.incrementOnHand({ ...base, delta: -quantityToApply }, tx);
        }
      }
    }
  }
}
""import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { SaleOrderStateHistory } from "src/modules/workflow/domain/entities/sale-order-state-history";
import { SaleOrderStateHistoryRepository } from "src/modules/workflow/domain/ports/sale-order-state-history.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SaleOrderStateHistoryEntity } from "../entities/sale-order-state-history.entity";

@Injectable()
export class SaleOrderStateHistoryTypeormRepository implements SaleOrderStateHistoryRepository {
  constructor(
    @InjectRepository(SaleOrderStateHistoryEntity)
    private readonly repo: Repository<SaleOrderStateHistoryEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }

    return this.repo.manager;
  }

  private toDomain(row: SaleOrderStateHistoryEntity) {
    return new SaleOrderStateHistory({
      id: row.id,
      saleOrderId: row.saleOrderId,
      workflowId: row.workflowId,
      transitionId: row.transitionId ?? null,
      fromStateId: row.fromStateId ?? null,
      toStateId: row.toStateId,
      executedBy: row.executedBy,
      executedAt: row.executedAt,
      metadata: row.metadata ?? null,
    });
  }

  async append(history: SaleOrderStateHistory, tx: TransactionContext): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(SaleOrderStateHistoryEntity).save({
      id: history.id,
      saleOrderId: history.saleOrderId,
      workflowId: history.workflowId,
      transitionId: history.transitionId,
      fromStateId: history.fromStateId,
      toStateId: history.toStateId,
      executedBy: history.executedBy,
      executedAt: history.executedAt,
      metadata: history.metadata,
    });
  }

  async listBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderStateHistory[]> {
    const manager = this.getManager(tx);
    const rows = await manager.getRepository(SaleOrderStateHistoryEntity).find({
      where: { saleOrderId },
      order: { executedAt: "ASC" },
    });
    return rows.map((row) => this.toDomain(row));
  }
}
"
"import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { WorkflowCondition } from "src/modules/workflow/domain/entities/workflow-condition";
import { WorkflowTransition } from "src/modules/workflow/domain/entities/workflow-transition";
import {
  WorkflowTransitionRepository,
  WorkflowTransitionWithConditions,
} from "src/modules/workflow/domain/ports/workflow-transition.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { WorkflowConditionEntity } from "../entities/workflow-condition.entity";
import { WorkflowTransitionEntity } from "../entities/workflow-transition.entity";
import { WorkflowAction } from "src/modules/workflow/domain/entities/workflow-action";
import { WorkflowActionEntity } from "../entities/workflow-action.entity";

@Injectable()
export class WorkflowTransitionTypeormRepository implements WorkflowTransitionRepository {
  constructor(
    @InjectRepository(WorkflowTransitionEntity)
    private readonly repo: Repository<WorkflowTransitionEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }

    return this.repo.manager;
  }

  private toTransition(row: WorkflowTransitionEntity) {
    return new WorkflowTransition({
      id: row.id,
      workflowId: row.workflowId,
      code: row.code,
      name: row.name,
      effect: row.effect,
      purpose: row.purpose,
      fromStateId: row.fromStateId,
      toStateId: row.toStateId,
      isGlobal: row.isGlobal,
      excludedStateIds: row.excludedStateIds ?? [],
      sourceHandle: row.sourceHandle ?? null,
      targetHandle: row.targetHandle ?? null,
      isActive: row.isActive,
    });
  }

  private toAction(row: WorkflowActionEntity) {
    return new WorkflowAction({
      id: row.id,
      transitionId: row.transitionId,
      type: row.type,
      config: row.config ?? {},
      position: row.position,
    });
  }

  private toCondition(row: WorkflowConditionEntity) {
    return new WorkflowCondition({
      id: row.id,
      transitionId: row.transitionId,
      type: row.type,
      config: row.config ?? {},
      position: row.position,
    });
  }

  async create(
    transition: WorkflowTransition,
    conditions: WorkflowCondition[],
    actions: WorkflowAction[],
    tx?: TransactionContext,
  ): Promise<WorkflowTransition> {
    const manager = this.getManager(tx);
    const saved = await manager.getRepository(WorkflowTransitionEntity).save({
      id: transition.id,
      workflowId: transition.workflowId,
      code: transition.code,
      name: transition.name,
      effect: transition.effect,
      purpose: transition.purpose,
      fromStateId: transition.fromStateId,
      toStateId: transition.toStateId,
      isGlobal: transition.isGlobal,
      excludedStateIds: transition.excludedStateIds,
      sourceHandle: transition.sourceHandle,
      targetHandle: transition.targetHandle,
      isActive: transition.isActive,
    });

    if (conditions.length) {
      await manager.getRepository(WorkflowConditionEntity).save(
        conditions.map((condition) => ({
          id: condition.id,
          transitionId: saved.id,
          type: condition.type,
          config: condition.config,
          position: condition.position,
        })),
      );
    }
    if (actions.length) {
      await manager.getRepository(WorkflowActionEntity).save(
        actions.map((action) => ({
          id: action.id,
          transitionId: saved.id,
          type: action.type,
          config: action.config,
          position: action.position,
        })),
      );
    }

    return this.toTransition(saved);
  }

  async findDetailedById(id: string, tx?: TransactionContext): Promise<WorkflowTransitionWithConditions | null> {
    const manager = this.getManager(tx);
    const transition = await manager.getRepository(WorkflowTransitionEntity).findOne({ where: { id } });
    if (!transition) {
      return null;
    }

    const conditions = await manager.getRepository(WorkflowConditionEntity).find({
      where: { transitionId: id },
      order: { position: "ASC" },
    });
    const actions = await manager.getRepository(WorkflowActionEntity).find({
      where: { transitionId: id },
      order: { position: "ASC" },
    });

    return {
      transition: this.toTransition(transition),
      conditions: conditions.map((condition) => this.toCondition(condition)),
      actions: actions.map((action) => this.toAction(action)),
    };
  }

  async listFromState(
    workflowId: string,
    fromStateId: string,
    tx?: TransactionContext,
  ): Promise<WorkflowTransitionWithConditions[]> {
    const manager = this.getManager(tx);
    const transitions = await manager
      .getRepository(WorkflowTransitionEntity)
      .createQueryBuilder("transition")
      .where("transition.workflow_id = :workflowId", { workflowId })
      .andWhere("transition.is_active = true")
      .andWhere(
        "(transition.from_state_id = :fromStateId OR (transition.is_global = true AND NOT (:fromStateId = ANY(transition.excluded_state_ids))))",
        { fromStateId },
      )
      .orderBy("transition.code", "ASC")
      .getMany();

    const transitionIds = transitions.map((transition) => transition.id);
    const conditions = transitionIds.length
      ? await manager.getRepository(WorkflowConditionEntity).find({
          where: transitionIds.map((transitionId) => ({ transitionId })),
          order: { position: "ASC" },
        })
      : [];
    const actions = transitionIds.length
      ? await manager.getRepository(WorkflowActionEntity).find({
          where: transitionIds.map((transitionId) => ({ transitionId })),
          order: { position: "ASC" },
        })
      : [];

    return transitions.map((transition) => ({
      transition: this.toTransition(transition),
      conditions: conditions
        .filter((condition) => condition.transitionId === transition.id)
        .map((condition) => this.toCondition(condition)),
      actions: actions
        .filter((action) => action.transitionId === transition.id)
        .map((action) => this.toAction(action)),
    }));
  }
}
"