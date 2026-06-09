import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { WorkflowStateRepository } from "src/modules/workflow/domain/ports/workflow-state.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { WorkflowState } from "src/modules/workflow/domain/entities/workflow-state";
import { WorkflowStateEntity } from "../entities/workflow-state.entity";

@Injectable()
export class WorkflowStateTypeormRepository implements WorkflowStateRepository {
  constructor(
    @InjectRepository(WorkflowStateEntity)
    private readonly repo: Repository<WorkflowStateEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }

    return this.repo.manager;
  }

  private toDomain(row: WorkflowStateEntity) {
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

  async create(state: WorkflowState, tx?: TransactionContext): Promise<WorkflowState> {
    const manager = this.getManager(tx);
    await manager.getRepository(WorkflowStateEntity).save({
      id: state.id,
      workflowId: state.workflowId,
      saleOrderStateId: state.saleOrderStateId,
      position: state.position,
      positionX: state.positionX,
      positionY: state.positionY,
      isInitial: state.isInitial,
      isFinal: state.isFinal,
      isActive: state.isActive,
    });

    return state;
  }

  async update(state: WorkflowState, tx?: TransactionContext): Promise<WorkflowState> {
    return this.create(state, tx);
  }

  async updatePositions(states: WorkflowState[], tx?: TransactionContext): Promise<WorkflowState[]> {
    if (states.length === 0) {
      return [];
    }

    const manager = this.getManager(tx);
    const repository = manager.getRepository(WorkflowStateEntity);
    await repository.save(
      states.map((state) => ({
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

    return states;
  }

  async findById(id: string, tx?: TransactionContext): Promise<WorkflowState | null> {
    const manager = this.getManager(tx);
    const row = await manager.getRepository(WorkflowStateEntity).findOne({ where: { id }, relations: { saleOrderState: true } });
    return row ? this.toDomain(row) : null;
  }

  async findInitialByWorkflowId(workflowId: string, tx?: TransactionContext): Promise<WorkflowState | null> {
    const manager = this.getManager(tx);
    const row = await manager.getRepository(WorkflowStateEntity).findOne({
      where: { workflowId, isInitial: true, isActive: true },
      relations: { saleOrderState: true },
      order: { position: "ASC" },
    });
    return row ? this.toDomain(row) : null;
  }

  async listByWorkflowId(workflowId: string, tx?: TransactionContext): Promise<WorkflowState[]> {
    const manager = this.getManager(tx);
    const rows = await manager.getRepository(WorkflowStateEntity).find({
      where: { workflowId },
      relations: { saleOrderState: true },
      order: { position: "ASC" },
    });
    return rows.map((row) => this.toDomain(row));
  }
}
