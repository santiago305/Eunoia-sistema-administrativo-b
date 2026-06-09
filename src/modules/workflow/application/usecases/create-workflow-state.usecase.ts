import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WorkflowState } from "../../domain/entities/workflow-state";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import { WORKFLOW_STATE_REPOSITORY, WorkflowStateRepository } from "../../domain/ports/workflow-state.repository";
import { CreateWorkflowStateInput } from "../dtos/create-workflow-state.input";
import { SALE_ORDER_STATES_REPOSITORY, SaleOrderStatesRepository } from "../../domain/ports/sale-order-states.repository";

export class CreateWorkflowStateUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(WORKFLOW_STATE_REPOSITORY)
    private readonly workflowStateRepo: WorkflowStateRepository,
    @Inject(SALE_ORDER_STATES_REPOSITORY)
    private readonly saleOrderStatesRepo: SaleOrderStatesRepository,
  ) {}

  async execute(input: CreateWorkflowStateInput) {
    return this.uow.runInTransaction(async (tx) => {
      const workflow = await this.workflowRepo.findById(input.workflowId, tx);
      if (!workflow) {
        throw new NotFoundException("Workflow no encontrado");
      }

      const globalState = await this.saleOrderStatesRepo.findById(input.saleOrderStateId, tx);
      if (!globalState) {
        throw new NotFoundException("Estado global no encontrado");
      }

      const existing = await this.workflowStateRepo.listByWorkflowId(input.workflowId, tx);
      if (existing.some((item) => item.saleOrderStateId === globalState.id)) {
        throw new BadRequestException("El estado global ya existe en el workflow");
      }
      if (input.isInitial && existing.some((item) => item.isInitial && item.isActive)) {
        throw new BadRequestException("Ya existe un estado inicial activo");
      }

      const state = new WorkflowState({
        id: crypto.randomUUID(),
        workflowId: input.workflowId,
        saleOrderStateId: globalState.id as string,
        code: globalState.code,
        name: globalState.name,
        color: globalState.color,
        position: input.position ?? existing.length,
        positionX: input.positionX ?? null,
        positionY: input.positionY ?? null,
        isInitial: input.isInitial ?? false,
        isFinal: input.isFinal ?? false,
        isActive: input.isActive ?? true,
      });

      return this.workflowStateRepo.create(state, tx);
    });
  }
}
