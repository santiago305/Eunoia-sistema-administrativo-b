import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CLOCK, ClockPort } from 'src/shared/application/ports/clock.port';
import { UNIT_OF_WORK, UnitOfWork } from 'src/shared/domain/ports/unit-of-work.port';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { SaleOrderEntity } from '../../adapters/out/persistence/typeorm/entities/sale-order.entity';
import { SaleOrder } from '../../domain/entities/sale-order';
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from '../../domain/ports/sale-order.repository';
import {
  SaleOrderEditPolicyService,
  SaleOrderStockStatus,
} from './sale-order-edit-policy.service';
import { SaleOrderStockCorrectionService } from './sale-order-stock-correction.service';
import { WORKFLOW_LIFECYCLE } from 'src/modules/workflow/domain/constants/workflow-lifecycle.constants';
import { ACTIONS } from 'src/modules/workflow/domain/constants/workflow-action.constants';
import { TRANSITION_EFFECTS } from 'src/modules/workflow/domain/constants/workflow-transition-effect.constants';
import { Workflow } from 'src/modules/workflow/domain/entities/workflow';
import { SaleOrderStateHistory } from 'src/modules/workflow/domain/entities/sale-order-state-history';
import { SaleOrderStateHistoryEntity } from 'src/modules/workflow/adapters/out/persistence/typeorm/entities/sale-order-state-history.entity';
import { WorkflowAction } from 'src/modules/workflow/domain/entities/workflow-action';
import { WorkflowState } from 'src/modules/workflow/domain/entities/workflow-state';
import { ConditionFactory } from 'src/modules/workflow/domain/factories/condition.factory';
import {
  WORKFLOW_REPOSITORY,
  WorkflowAggregate,
  WorkflowRepository,
} from 'src/modules/workflow/domain/ports/workflow.repository';
import {
  WORKFLOW_TRANSITION_REPOSITORY,
  WorkflowTransitionRepository,
} from 'src/modules/workflow/domain/ports/workflow-transition.repository';
import {
  SALE_ORDER_STATE_HISTORY_REPOSITORY,
  SaleOrderStateHistoryRepository,
} from 'src/modules/workflow/domain/ports/sale-order-state-history.repository';
import { WorkflowEngine } from 'src/modules/workflow/domain/services/workflow-engine';
import { WorkflowStateEntity } from 'src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow-state.entity';
import { WorkflowEntity } from 'src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow.entity';
import {
  WORKFLOW_TEST_STATUS,
  WorkflowDraftTestSessionEntity,
} from 'src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow-draft-test-session.entity';
import { SaleOrderWorkflowContextService } from 'src/modules/workflow/application/services/sale-order-workflow-context.service';

type NormalizedStockStatus = 'NONE' | 'RESERVED' | 'CONSUMED';

type MigrationAnalysis = {
  targetState: WorkflowState;
  desiredStockStatus: NormalizedStockStatus;
  warehouseId: string | null;
  transitionIds: string[];
  transitionNames: string[];
  tracking: { invoiceSend: boolean; prepared: boolean; preguide: boolean };
};

@Injectable()
export class WorkflowRevisionLifecycleService {
  private readonly engine = new WorkflowEngine();

  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(WORKFLOW_TRANSITION_REPOSITORY)
    private readonly transitionRepo: WorkflowTransitionRepository,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo: SaleOrderStateHistoryRepository,
    private readonly editPolicy: SaleOrderEditPolicyService,
    private readonly stockCorrection: SaleOrderStockCorrectionService,
    private readonly contextService: SaleOrderWorkflowContextService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @InjectRepository(WorkflowDraftTestSessionEntity)
    private readonly testSessionRepo: Repository<WorkflowDraftTestSessionEntity>,
  ) {}

  async listTests(draftWorkflowId: string) {
    return this.testSessionRepo
      .createQueryBuilder('session')
      .innerJoin(SaleOrderEntity, 'saleOrder', 'saleOrder.id = session.sale_order_id')
      .leftJoin(WorkflowStateEntity, 'state', 'state.id = saleOrder.current_state_id')
      .select([
        'session.id AS "id"',
        'session.sale_order_id AS "saleOrderId"',
        'session.status AS "status"',
        'session.started_at AS "startedAt"',
        'session.reverted_at AS "revertedAt"',
        'saleOrder.serie AS "serie"',
        'saleOrder.correlative AS "correlative"',
        'state.sale_order_state_id AS "currentSaleOrderStateId"',
      ])
      .where('session.draft_workflow_id = :draftWorkflowId', { draftWorkflowId })
      .orderBy('session.started_at', 'DESC')
      .getRawMany();
  }

  async startTest(input: {
    draftWorkflowId: string;
    saleOrderId: string;
    executedBy: string;
  }) {
    return this.uow.runInTransaction(async (tx) => {
      const manager = this.getManager(tx);
      const aggregate = await this.getDraft(input.draftWorkflowId, tx);
      const initialState = aggregate.states.find((state) => state.isInitial && state.isActive);
      if (!initialState) throw new BadRequestException('El borrador no tiene estado inicial');

      const order = await this.saleOrderRepo.findByIdForUpdate(input.saleOrderId, tx);
      if (!order?.workflowId || !order.currentStateId) {
        throw new BadRequestException('El pedido debe tener un flujo y estado actuales');
      }
      const currentAggregate = await this.workflowRepo.findDetailedById(order.workflowId, tx);
      const currentState = currentAggregate?.states.find(
        (state) => state.id === order.currentStateId,
      );
      if (!currentState) throw new BadRequestException('Estado actual del pedido invalido');
      if (currentAggregate?.workflow.familyId !== aggregate.workflow.familyId) {
        throw new BadRequestException(
          'El pedido de prueba debe pertenecer a la misma familia del flujo',
        );
      }
      if (currentState.isFinal) {
        throw new BadRequestException('No se puede probar con un pedido finalizado');
      }

      const active = await manager.getRepository(WorkflowDraftTestSessionEntity).findOne({
        where: { saleOrderId: order.id, status: WORKFLOW_TEST_STATUS.ACTIVE },
      });
      if (active) throw new ConflictException('El pedido ya participa en una prueba activa');

      const row = await manager.getRepository(SaleOrderEntity).findOneByOrFail({ id: order.id });
      const policy = await this.editPolicy.resolve(order, tx);
      const session = await manager.getRepository(WorkflowDraftTestSessionEntity).save({
        id: crypto.randomUUID(),
        draftWorkflowId: aggregate.workflow.id,
        saleOrderId: order.id,
        originalWorkflowId: order.workflowId,
        originalStateId: order.currentStateId,
        originalStockStatus: policy.stockStatus,
        originalWarehouseId: order.warehouseId,
        originalInvoiceSend: order.invoiceSend,
        originalPrepared: order.prepared,
        originalPreguide: order.preguide,
        originalReserveBool: order.reserveBool,
        originalStockRevertedBool: row.stockRevertedBool,
        status: WORKFLOW_TEST_STATUS.ACTIVE,
        startedBy: input.executedBy,
      });

      await this.reconcileStock(order, policy.stockStatus, 'NONE', input.executedBy, tx);
      await manager.getRepository(SaleOrderEntity).update(
        { id: order.id },
        {
          workflowId: aggregate.workflow.id,
          currentStateId: initialState.id,
          warehouseId: null,
          invoiceSend: false,
          prepared: false,
          preguide: false,
          reserveBool: false,
          stockRevertedBool: false,
        },
      );
      await this.appendHistory({
        saleOrderId: order.id,
        workflowId: aggregate.workflow.id,
        fromStateId: order.currentStateId,
        toStateId: initialState.id,
        executedBy: input.executedBy,
        metadata: {
          source: 'workflow-draft-test-start',
          testSessionId: session.id,
          originalWorkflowId: order.workflowId,
          stockStatus: 'NONE',
        },
      }, tx);

      return {
        sessionId: session.id,
        saleOrderId: order.id,
        draftWorkflowId: aggregate.workflow.id,
        currentState: initialState,
      };
    });
  }

  async revertTest(input: {
    draftWorkflowId: string;
    sessionId: string;
    executedBy: string;
  }) {
    return this.uow.runInTransaction((tx) => this.revertTestInTransaction(input, tx));
  }

  async previewPublish(draftWorkflowId: string) {
    const aggregate = await this.getDraft(draftWorkflowId);
    await this.assertNoCurrentNameConflict(aggregate.workflow);
    const rows = await this.listPendingFamilyOrders(aggregate.workflow.familyId);
    const items = [] as Array<Record<string, unknown>>;

    for (const row of rows) {
      const order = row as unknown as SaleOrder;
      const [analysis, policy] = await Promise.all([
        this.analyzeTarget(order, aggregate),
        this.editPolicy.resolve(order),
      ]);
      items.push({
        saleOrderId: order.id,
        serie: order.serie,
        correlative: order.correlative,
        fromWorkflowId: order.workflowId,
        fromStateId: order.currentStateId,
        toStateId: analysis.targetState.id,
        toStateName: analysis.targetState.name,
        currentStockStatus: policy.stockStatus,
        desiredStockStatus: analysis.desiredStockStatus,
        fromWarehouseId: order.warehouseId,
        toWarehouseId: analysis.warehouseId,
        warehouseChanged: order.warehouseId !== analysis.warehouseId,
        stockActions: this.planMigrationStockActions(
          policy.stockStatus,
          analysis.desiredStockStatus,
          order.warehouseId,
          analysis.warehouseId,
        ),
        transitionNames: analysis.transitionNames,
      });
    }

    const activeTests = await this.testSessionRepo.count({
      where: { draftWorkflowId, status: WORKFLOW_TEST_STATUS.ACTIVE },
    });
    return {
      workflowId: aggregate.workflow.id,
      revision: aggregate.workflow.revision,
      pendingOrders: items.length,
      activeTests,
      inventoryAdjustments: items.filter(
        (item) => (item.stockActions as string[]).length > 0,
      ).length,
      items,
    };
  }

  async publish(input: { draftWorkflowId: string; executedBy: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const aggregate = await this.getDraft(input.draftWorkflowId, tx);
      const manager = this.getManager(tx);
      await this.assertNoCurrentNameConflict(aggregate.workflow, tx);
      const activeTests = await manager.getRepository(WorkflowDraftTestSessionEntity).find({
        where: {
          draftWorkflowId: aggregate.workflow.id,
          status: WORKFLOW_TEST_STATUS.ACTIVE,
        },
      });
      for (const session of activeTests) {
        await this.revertTestInTransaction(
          {
            draftWorkflowId: aggregate.workflow.id,
            sessionId: session.id,
            executedBy: input.executedBy,
          },
          tx,
        );
      }

      const pendingOrderIds = (
        await this.listPendingFamilyOrders(aggregate.workflow.familyId, tx)
      ).map((order) => order.id);
      const migrations: Array<Record<string, unknown>> = [];
      for (const saleOrderId of pendingOrderIds) {
        const order = await this.saleOrderRepo.findByIdForUpdate(saleOrderId, tx);
        if (!order?.workflowId || !order.currentStateId) continue;
        const analysis = await this.analyzeTarget(order, aggregate, tx);
        const policy = await this.editPolicy.resolve(order, tx);
        const stockActions = this.planMigrationStockActions(
          policy.stockStatus,
          analysis.desiredStockStatus,
          order.warehouseId,
          analysis.warehouseId,
        );
        if (order.warehouseId !== analysis.warehouseId) {
          await this.reconcileStock(
            order,
            policy.stockStatus,
            'NONE',
            input.executedBy,
            tx,
          );
          await manager.getRepository(SaleOrderEntity).update(
            { id: order.id },
            { warehouseId: analysis.warehouseId },
          );
          const orderWithTargetWarehouse = await this.saleOrderRepo.findByIdForUpdate(
            order.id,
            tx,
          );
          if (!orderWithTargetWarehouse) {
            throw new NotFoundException('Pedido no encontrado durante la migracion');
          }
          await this.reconcileStock(
            orderWithTargetWarehouse,
            'NONE',
            analysis.desiredStockStatus,
            input.executedBy,
            tx,
          );
        } else {
          await this.reconcileStock(
            order,
            policy.stockStatus,
            analysis.desiredStockStatus,
            input.executedBy,
            tx,
          );
        }
        await manager.getRepository(SaleOrderEntity).update(
          { id: order.id },
          {
            workflowId: aggregate.workflow.id,
            currentStateId: analysis.targetState.id,
            warehouseId: analysis.warehouseId,
            invoiceSend: analysis.tracking.invoiceSend,
            prepared: analysis.tracking.prepared,
            preguide: analysis.tracking.preguide,
          },
        );
        await this.appendHistory({
          saleOrderId: order.id,
          workflowId: aggregate.workflow.id,
          fromStateId: order.currentStateId,
          toStateId: analysis.targetState.id,
          executedBy: input.executedBy,
          metadata: {
            source: 'workflow-revision-migration',
            fromWorkflowId: order.workflowId,
            toWorkflowId: aggregate.workflow.id,
            transitionIds: analysis.transitionIds,
            stockActions,
            stockStatus: analysis.desiredStockStatus,
            fromWarehouseId: order.warehouseId,
            toWarehouseId: analysis.warehouseId,
          },
        }, tx);
        migrations.push({ saleOrderId: order.id, toState: analysis.targetState, stockActions });
      }

      const family =
        (await this.workflowRepo.listByFamilyId?.(aggregate.workflow.familyId, tx)) ?? [];
      const previousCurrent = family.find(
        (workflow) =>
          workflow.isCurrent && workflow.lifecycleStatus === WORKFLOW_LIFECYCLE.PUBLISHED,
      );
      if (previousCurrent) {
        await this.workflowRepo.update(
          this.copyWorkflow(previousCurrent, {
            lifecycleStatus: WORKFLOW_LIFECYCLE.ARCHIVED,
            isCurrent: false,
          }),
          tx,
        );
      }
      const published = await this.workflowRepo.update(
        this.copyWorkflow(aggregate.workflow, {
          lifecycleStatus: WORKFLOW_LIFECYCLE.PUBLISHED,
          isCurrent: true,
          isActive: true,
          publishedAt: this.clock.now(),
          publishedBy: input.executedBy,
        }),
        tx,
      );
      return {
        workflow: published,
        revertedTests: activeTests.length,
        migratedOrders: migrations.length,
        migrations,
      };
    });
  }

  private async revertTestInTransaction(
    input: { draftWorkflowId: string; sessionId: string; executedBy: string },
    tx: TransactionContext,
  ) {
    const manager = this.getManager(tx);
    const session = await manager.getRepository(WorkflowDraftTestSessionEntity).findOne({
      where: {
        id: input.sessionId,
        draftWorkflowId: input.draftWorkflowId,
        status: WORKFLOW_TEST_STATUS.ACTIVE,
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!session) throw new NotFoundException('Prueba activa no encontrada');
    if (!session.originalWorkflowId || !session.originalStateId) {
      throw new BadRequestException('La prueba no tiene un estado original restaurable');
    }
    let order = await this.saleOrderRepo.findByIdForUpdate(session.saleOrderId, tx);
    if (!order) throw new NotFoundException('Pedido de prueba no encontrado');
    const currentPolicy = await this.editPolicy.resolve(order, tx);
    await this.reconcileStock(order, currentPolicy.stockStatus, 'NONE', input.executedBy, tx);

    await manager.getRepository(SaleOrderEntity).update(
      { id: order.id },
      { warehouseId: session.originalWarehouseId ?? null },
    );
    order = (await this.saleOrderRepo.findByIdForUpdate(order.id, tx)) as SaleOrder;
    await this.reconcileStock(
      order,
      'NONE',
      this.normalizeStockStatus(session.originalStockStatus),
      input.executedBy,
      tx,
    );
    await manager.getRepository(SaleOrderEntity).update(
      { id: order.id },
      {
        workflowId: session.originalWorkflowId,
        currentStateId: session.originalStateId,
        warehouseId: session.originalWarehouseId ?? null,
        invoiceSend: session.originalInvoiceSend,
        prepared: session.originalPrepared,
        preguide: session.originalPreguide,
        reserveBool: session.originalReserveBool,
        stockRevertedBool: session.originalStockRevertedBool,
      },
    );
    await manager.getRepository(WorkflowDraftTestSessionEntity).update(
      { id: session.id },
      {
        status: WORKFLOW_TEST_STATUS.REVERTED,
        revertedBy: input.executedBy,
        revertedAt: this.clock.now(),
      },
    );
    await manager
      .getRepository(SaleOrderStateHistoryEntity)
      .createQueryBuilder()
      .delete()
      .where('sale_order_id = :saleOrderId', { saleOrderId: order.id })
      .andWhere('workflow_id = :draftWorkflowId', {
        draftWorkflowId: session.draftWorkflowId,
      })
      .andWhere('executed_at >= :startedAt', { startedAt: session.startedAt })
      .execute();
    await this.appendHistory({
      saleOrderId: order.id,
      workflowId: session.originalWorkflowId,
      fromStateId: session.originalStateId,
      toStateId: session.originalStateId,
      executedBy: input.executedBy,
      metadata: {
        source: 'workflow-draft-test-revert',
        testSessionId: session.id,
        stockStatus: session.originalStockStatus,
      },
    }, tx);
    return { sessionId: session.id, saleOrderId: order.id, status: WORKFLOW_TEST_STATUS.REVERTED };
  }

  private async getDraft(workflowId: string, tx?: TransactionContext) {
    const aggregate = await this.workflowRepo.findDetailedById(workflowId, tx);
    if (!aggregate) throw new NotFoundException('Workflow no encontrado');
    if (aggregate.workflow.lifecycleStatus !== WORKFLOW_LIFECYCLE.DRAFT) {
      throw new BadRequestException('La operacion requiere una revision en borrador');
    }
    return aggregate;
  }

  private async assertNoCurrentNameConflict(
    workflow: Workflow,
    tx?: TransactionContext,
  ) {
    const conflictingCurrent = await this.workflowRepo.findActiveByNormalizedName(
      workflow.normalizedName,
      tx,
    );
    if (
      conflictingCurrent &&
      conflictingCurrent.workflow.familyId !== workflow.familyId
    ) {
      throw new ConflictException(
        'Ya existe otro flujo publicado vigente con el mismo nombre',
      );
    }
  }

  private async listPendingFamilyOrders(familyId: string, tx?: TransactionContext) {
    return this.getManager(tx)
      .getRepository(SaleOrderEntity)
      .createQueryBuilder('saleOrder')
      .innerJoin(WorkflowEntity, 'workflow', 'workflow.id = saleOrder.workflow_id')
      .innerJoin(WorkflowStateEntity, 'state', 'state.id = saleOrder.current_state_id')
      .where('workflow.family_id = :familyId', { familyId })
      .andWhere('state.is_final = false')
      .andWhere('saleOrder.is_active = true')
      .orderBy('saleOrder.created_at', 'ASC')
      .getMany();
  }

  private async analyzeTarget(
    order: SaleOrder,
    aggregate: WorkflowAggregate,
    tx?: TransactionContext,
  ): Promise<MigrationAnalysis> {
    let state = aggregate.states.find((item) => item.isInitial && item.isActive);
    if (!state) throw new BadRequestException('El borrador no tiene estado inicial activo');
    let desiredStockStatus: NormalizedStockStatus = 'NONE';
    let warehouseId = order.warehouseId ?? null;
    const transitionIds: string[] = [];
    const transitionNames: string[] = [];
    const executedActionOnly = new Set<string>();
    const tracking = { invoiceSend: false, prepared: false, preguide: false };
    let virtualOrder = {
      ...order,
      workflowId: aggregate.workflow.id,
      currentStateId: state.id,
      invoiceSend: false,
      prepared: false,
      preguide: false,
      reserveBool: false,
      warehouseId,
    } as SaleOrder;

    for (let step = 0; step < 100; step += 1) {
      const context = await this.contextService.build(virtualOrder, state, tx);
      const bundles = (await this.transitionRepo.listFromState(
        aggregate.workflow.id,
        state.id,
        tx,
      ))
        .filter(
          ({ transition }) =>
            transition.autoTrigger &&
            transition.isActive &&
            !executedActionOnly.has(transition.id),
        )
        .sort(
          (left, right) =>
            left.transition.priority - right.transition.priority ||
            left.transition.id.localeCompare(right.transition.id),
        );
      let selected:
        | {
            id: string;
            name: string;
            effect: string;
            toStateId: string | null;
            actions: WorkflowAction[];
          }
        | undefined;

      for (const bundle of bundles) {
        const passed = this.engine
          .evaluateConditions(
            bundle.conditions.map((condition) => ConditionFactory.create(condition)),
            context,
          )
          .every((evaluation) => evaluation.passed);
        const effect = passed ? bundle.transition.effect : bundle.transition.elseEffect;
        if (!effect) continue;
        selected = {
          id: bundle.transition.id,
          name: bundle.transition.name,
          effect,
          toStateId: passed
            ? bundle.transition.toStateId
            : bundle.transition.elseToStateId,
          actions: bundle.actions
            .filter((action) => action.branch === (passed ? 'THEN' : 'ELSE'))
            .sort((left, right) => left.position - right.position),
        };
        break;
      }
      if (!selected) break;
      transitionIds.push(selected.id);
      transitionNames.push(selected.name);
      for (const action of selected.actions) {
        desiredStockStatus = this.applyDesiredStock(desiredStockStatus, action.type);
        if (!warehouseId && typeof action.config.warehouseId === 'string') {
          if (
            action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW &&
            action.config.workflowId === aggregate.workflow.id
          ) {
            warehouseId = action.config.warehouseId;
          }
          if (action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE) {
            const provinceId = context.variables['client.provinceId'];
            const provinceIds = Array.isArray(action.config.provinceIds)
              ? action.config.provinceIds
              : [];
            const isListed =
              typeof provinceId === 'string' && provinceIds.includes(provinceId);
            const matches =
              action.config.mode === 'INCLUDE' ? isListed : !isListed;
            if (provinceId && matches) warehouseId = action.config.warehouseId;
          }
        }
        if (action.type === ACTIONS.MARK_INVOICE_SENT) tracking.invoiceSend = true;
        if (action.type === ACTIONS.MARK_PREPARED) tracking.prepared = true;
        if (action.type === ACTIONS.UNMARK_PREPARED) tracking.prepared = false;
        if (action.type === ACTIONS.MARK_PREGUIDE) tracking.preguide = true;
        if (action.type === ACTIONS.UNMARK_PREGUIDE) tracking.preguide = false;
      }
      virtualOrder = {
        ...virtualOrder,
        ...tracking,
        reserveBool: desiredStockStatus === 'RESERVED',
        warehouseId,
      } as SaleOrder;

      if (selected.effect === TRANSITION_EFFECTS.RUN_ACTIONS) {
        executedActionOnly.add(selected.id);
        continue;
      }
      const nextState = aggregate.states.find((item) => item.id === selected?.toStateId);
      if (!nextState) throw new BadRequestException('Ruta automatica con destino invalido');
      state = nextState;
      virtualOrder = { ...virtualOrder, currentStateId: state.id } as SaleOrder;
      if (state.isFinal) break;
    }

    return {
      targetState: state,
      desiredStockStatus,
      warehouseId,
      transitionIds,
      transitionNames,
      tracking,
    };
  }

  private async reconcileStock(
    order: SaleOrder,
    from: SaleOrderStockStatus,
    to: NormalizedStockStatus,
    executedBy: string,
    tx: TransactionContext,
  ) {
    const actual = this.normalizeStockStatus(from);
    if (actual === to) return;
    if (to === 'NONE') {
      await this.stockCorrection.releasePreviousComposition(order, actual, executedBy, tx);
      return;
    }
    if (to === 'RESERVED') {
      if (actual === 'CONSUMED') {
        await this.stockCorrection.restoreConsumedAsReserved(order, executedBy, tx);
      } else {
        await this.stockCorrection.reserveCorrectedComposition(order, tx);
      }
      return;
    }
    if (actual === 'CONSUMED') return;
    if (actual === 'NONE') await this.stockCorrection.reserveCorrectedComposition(order, tx);
    await this.stockCorrection.consumeCorrectedComposition(order, tx);
  }

  private planStockActions(from: SaleOrderStockStatus, to: NormalizedStockStatus) {
    const actual = this.normalizeStockStatus(from);
    if (actual === to) return [];
    if (actual === 'RESERVED' && to === 'NONE') return [ACTIONS.REVERT_STOCK];
    if (actual === 'CONSUMED' && to === 'NONE') return [ACTIONS.RESTORE_STOCK];
    if (actual === 'NONE' && to === 'RESERVED') return [ACTIONS.RESERVE_STOCK];
    if (actual === 'RESERVED' && to === 'CONSUMED') return [ACTIONS.CONSUME_STOCK];
    if (actual === 'CONSUMED' && to === 'RESERVED') {
      return [ACTIONS.RESTORE_STOCK, ACTIONS.RESERVE_STOCK];
    }
    if (actual === 'NONE' && to === 'CONSUMED') {
      return [ACTIONS.RESERVE_STOCK, ACTIONS.CONSUME_STOCK];
    }
    return [];
  }

  private planMigrationStockActions(
    from: SaleOrderStockStatus,
    to: NormalizedStockStatus,
    fromWarehouseId: string | null | undefined,
    toWarehouseId: string | null | undefined,
  ) {
    if ((fromWarehouseId ?? null) === (toWarehouseId ?? null)) {
      return this.planStockActions(from, to);
    }
    return [
      ...this.planStockActions(from, 'NONE'),
      ...this.planStockActions('NONE', to),
    ];
  }

  private normalizeStockStatus(status: SaleOrderStockStatus): NormalizedStockStatus {
    return status === 'REVERTED' ? 'NONE' : status;
  }

  private applyDesiredStock(
    current: NormalizedStockStatus,
    actionType: string,
  ): NormalizedStockStatus {
    if (actionType === ACTIONS.RESERVE_STOCK) return 'RESERVED';
    if (actionType === ACTIONS.CONSUME_STOCK) return 'CONSUMED';
    if (actionType === ACTIONS.REVERT_STOCK || actionType === ACTIONS.RESTORE_STOCK) {
      return 'NONE';
    }
    return current;
  }

  private appendHistory(
    input: {
      saleOrderId: string;
      workflowId: string;
      fromStateId: string | null;
      toStateId: string;
      executedBy: string;
      metadata: Record<string, unknown>;
    },
    tx: TransactionContext,
  ) {
    return this.historyRepo.append(
      new SaleOrderStateHistory({
        id: crypto.randomUUID(),
        saleOrderId: input.saleOrderId,
        workflowId: input.workflowId,
        transitionId: null,
        fromStateId: input.fromStateId,
        toStateId: input.toStateId,
        executedBy: input.executedBy,
        executedAt: this.clock.now(),
        metadata: input.metadata,
      }),
      tx,
    );
  }

  private copyWorkflow(
    workflow: Workflow,
    patch: Partial<{
      lifecycleStatus: typeof workflow.lifecycleStatus;
      isCurrent: boolean;
      isActive: boolean;
      publishedAt: Date | null;
      publishedBy: string | null;
    }>,
  ) {
    return new Workflow({
      ...workflow,
      ...patch,
      updatedAt: this.clock.now(),
    });
  }

  private getManager(tx?: TransactionContext): EntityManager {
    return tx && (tx as TypeormTransactionContext).manager
      ? (tx as TypeormTransactionContext).manager
      : this.testSessionRepo.manager;
  }
}
