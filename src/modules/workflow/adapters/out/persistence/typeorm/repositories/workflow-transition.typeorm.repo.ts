import { Injectable } from "@nestjs/common";
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
