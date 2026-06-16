import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { WorkflowRepository, WorkflowAggregate, WorkflowWithInitialState } from "src/modules/workflow/domain/ports/workflow.repository";
import { Workflow } from "src/modules/workflow/domain/entities/workflow";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { WorkflowEntity } from "../entities/workflow.entity";
import { WorkflowStateEntity } from "../entities/workflow-state.entity";
import { WorkflowTransitionEntity } from "../entities/workflow-transition.entity";
import { WorkflowConditionEntity } from "../entities/workflow-condition.entity";
import { WorkflowState } from "src/modules/workflow/domain/entities/workflow-state";
import { WorkflowTransition } from "src/modules/workflow/domain/entities/workflow-transition";
import { WorkflowCondition } from "src/modules/workflow/domain/entities/workflow-condition";
import { SaleOrderStateHistoryEntity } from "../entities/sale-order-state-history.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { WorkflowActionEntity } from "../entities/workflow-action.entity";
import { WorkflowAction } from "src/modules/workflow/domain/entities/workflow-action";

@Injectable()
export class WorkflowTypeormRepository implements WorkflowRepository {
  constructor(
    @InjectRepository(WorkflowEntity)
    private readonly repo: Repository<WorkflowEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }

    return this.repo.manager;
  }

  private toDomain(row: WorkflowEntity) {
    return new Workflow({
      id: row.id,
      name: row.name,
      normalizedName: row.normalizedName,
      description: row.description ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? null,
    });
  }

  private toState(row: WorkflowStateEntity) {
    if (!row.saleOrderState) {
      throw new Error("Estado global no cargado");
    }
    return new WorkflowState({
      id: row.id,
      workflowId: row.workflowId,
      saleOrderStateId: row.saleOrderStateId,
      code: row.saleOrderState.code,
      name: row.saleOrderState.name,
      color: row.saleOrderState.color,
      position: row.position,
      positionX: row.positionX ?? null,
      positionY: row.positionY ?? null,
      isInitial: row.isInitial,
      isFinal: row.isFinal,
      isActive: row.isActive,
    });
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
      autoTrigger: row.autoTrigger,
      priority: row.priority,
      elseEffect: row.elseEffect ?? null,
      elseToStateId: row.elseToStateId ?? null,
    });
  }

  private toAction(row: WorkflowActionEntity) {
    return new WorkflowAction({
      id: row.id,
      transitionId: row.transitionId,
      type: row.type,
      config: row.config ?? {},
      position: row.position,
      branch: row.branch,
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

  async create(workflow: Workflow, tx?: TransactionContext): Promise<Workflow> {
    const manager = this.getManager(tx);
    const saved = await manager.getRepository(WorkflowEntity).save({
      id: workflow.id,
      name: workflow.name,
      normalizedName: workflow.normalizedName,
      description: workflow.description,
      isActive: workflow.isActive,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    });

    return this.toDomain(saved);
  }

  async update(workflow: Workflow, tx?: TransactionContext): Promise<Workflow> {
    return this.create(workflow, tx);
  }

  async findById(id: string, tx?: TransactionContext): Promise<Workflow | null> {
    const manager = this.getManager(tx);
    const row = await manager.getRepository(WorkflowEntity).findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findDetailedById(id: string, tx?: TransactionContext): Promise<WorkflowAggregate | null> {
    const manager = this.getManager(tx);
    const workflow = await manager.getRepository(WorkflowEntity).findOne({ where: { id } });
    if (!workflow) {
      return null;
    }

    const [states, transitions, conditions, actions] = await Promise.all([
      manager.getRepository(WorkflowStateEntity).find({ where: { workflowId: id }, relations: { saleOrderState: true }, order: { position: "ASC" } }),
      manager.getRepository(WorkflowTransitionEntity).find({ where: { workflowId: id } }),
      manager
        .getRepository(WorkflowConditionEntity)
        .createQueryBuilder("condition")
        .innerJoin(WorkflowTransitionEntity, "transition", "transition.id = condition.transition_id")
        .where("transition.workflow_id = :workflowId", { workflowId: id })
        .orderBy("condition.position", "ASC")
        .getMany(),
      manager
        .getRepository(WorkflowActionEntity)
        .createQueryBuilder("action")
        .innerJoin(WorkflowTransitionEntity, "transition", "transition.id = action.transition_id")
        .where("transition.workflow_id = :workflowId", { workflowId: id })
        .orderBy("action.position", "ASC")
        .getMany(),
    ]);

    return {
      workflow: this.toDomain(workflow),
      states: states.map((state) => this.toState(state)),
      transitions: transitions.map((transition) => this.toTransition(transition)),
      conditions: conditions.map((condition) => this.toCondition(condition)),
      actions: actions.map((action) => this.toAction(action)),
    };
  }

  async findActiveByNormalizedName(
    normalizedName: string,
    tx?: TransactionContext,
  ): Promise<WorkflowWithInitialState | null> {
    const manager = this.getManager(tx);
    const workflow = await manager.getRepository(WorkflowEntity).findOne({
      where: { normalizedName, isActive: true },
    });

    if (!workflow) {
      return null;
    }

    const initialState = await manager.getRepository(WorkflowStateEntity).findOne({
      where: { workflowId: workflow.id, isInitial: true, isActive: true },
      relations: { saleOrderState: true },
      order: { position: "ASC" },
    });

    if (!initialState) {
      return null;
    }

    return {
      workflow: this.toDomain(workflow),
      initialState: this.toState(initialState),
    };
  }

  async list(tx?: TransactionContext): Promise<Workflow[]> {
    const manager = this.getManager(tx);
    const rows = await manager.getRepository(WorkflowEntity).find({
      order: { createdAt: "DESC" },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async saveFull(
    aggregate: WorkflowAggregate,
    options: { synchronize: boolean },
    tx: TransactionContext,
  ): Promise<WorkflowAggregate> {
    const manager = this.getManager(tx);
    const workflowRepo = manager.getRepository(WorkflowEntity);
    const stateRepo = manager.getRepository(WorkflowStateEntity);
    const transitionRepo = manager.getRepository(WorkflowTransitionEntity);
    const conditionRepo = manager.getRepository(WorkflowConditionEntity);
    const actionRepo = manager.getRepository(WorkflowActionEntity);

    if (options.synchronize) {
      const [existingStates, existingTransitions] = await Promise.all([
        stateRepo.find({ where: { workflowId: aggregate.workflow.id } }),
        transitionRepo.find({ where: { workflowId: aggregate.workflow.id } }),
      ]);
      const incomingStateIds = new Set(aggregate.states.map((state) => state.id));
      const incomingTransitionIds = new Set(aggregate.transitions.map((transition) => transition.id));
      const removedStateIds = existingStates.filter((state) => !incomingStateIds.has(state.id)).map((state) => state.id);
      const removedTransitionIds = existingTransitions
        .filter((transition) => !incomingTransitionIds.has(transition.id))
        .map((transition) => transition.id);

      if (removedTransitionIds.length) {
        const historyCount = await manager
          .getRepository(SaleOrderStateHistoryEntity)
          .createQueryBuilder("history")
          .where("history.transition_id IN (:...ids)", { ids: removedTransitionIds })
          .getCount();
        if (historyCount > 0) {
          throw new ConflictException("No se pueden eliminar transiciones referenciadas por el historial");
        }
      }

      if (removedStateIds.length) {
        const [orderCount, historyCount] = await Promise.all([
          manager
            .getRepository(SaleOrderEntity)
            .createQueryBuilder("saleOrder")
            .where("saleOrder.current_state_id IN (:...ids)", { ids: removedStateIds })
            .getCount(),
          manager
            .getRepository(SaleOrderStateHistoryEntity)
            .createQueryBuilder("history")
            .where(
              "history.from_state_id IN (:...ids) OR history.to_state_id IN (:...ids)",
              { ids: removedStateIds },
            )
            .getCount(),
        ]);
        if (orderCount > 0 || historyCount > 0) {
          throw new ConflictException("No se pueden eliminar estados referenciados por pedidos o historial");
        }
      }

      if (removedTransitionIds.length) {
        await actionRepo
          .createQueryBuilder()
          .delete()
          .where("transition_id IN (:...ids)", { ids: removedTransitionIds })
          .execute();
        await conditionRepo
          .createQueryBuilder()
          .delete()
          .where("transition_id IN (:...ids)", { ids: removedTransitionIds })
          .execute();
        await transitionRepo.delete(removedTransitionIds);
      }
      if (removedStateIds.length) {
        await stateRepo.delete(removedStateIds);
      }
    }

    await workflowRepo.save({
      id: aggregate.workflow.id,
      name: aggregate.workflow.name,
      normalizedName: aggregate.workflow.normalizedName,
      description: aggregate.workflow.description,
      isActive: aggregate.workflow.isActive,
      createdAt: aggregate.workflow.createdAt,
      updatedAt: aggregate.workflow.updatedAt,
    });
    await stateRepo.save(
      aggregate.states.map((state) => ({
        id: state.id,
        workflowId: state.workflowId,
        saleOrderStateId: state.saleOrderStateId,
        position: state.position,
        positionX: state.positionX,
        positionY: state.positionY,
        isInitial: state.isInitial,
        isFinal: state.isFinal,
        isActive: state.isActive,
      })),
    );

    const transitionIds = aggregate.transitions.map((transition) => transition.id);
    if (transitionIds.length) {
      await actionRepo
        .createQueryBuilder()
        .delete()
        .where("transition_id IN (:...ids)", { ids: transitionIds })
        .execute();
      await conditionRepo
        .createQueryBuilder()
        .delete()
        .where("transition_id IN (:...ids)", { ids: transitionIds })
        .execute();
    }
    if (aggregate.transitions.length) {
      await transitionRepo.save(
        aggregate.transitions.map((transition) => ({
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
          autoTrigger: transition.autoTrigger,
          priority: transition.priority,
          elseEffect: transition.elseEffect,
          elseToStateId: transition.elseToStateId,
        })),
      );
    }
    if (aggregate.conditions.length) {
      await conditionRepo.save(
        aggregate.conditions.map((condition) => ({
          id: condition.id,
          transitionId: condition.transitionId,
          type: condition.type,
          config: condition.config,
          position: condition.position,
        })),
      );
    }
    if (aggregate.actions.length) {
      await actionRepo.save(
        aggregate.actions.map((action) => ({
          id: action.id,
          transitionId: action.transitionId,
          type: action.type,
          config: action.config,
          position: action.position,
          branch: action.branch,
        })),
      );
    }

    return aggregate;
  }
}
