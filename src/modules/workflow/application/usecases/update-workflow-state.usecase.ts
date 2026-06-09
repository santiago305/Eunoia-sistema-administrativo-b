import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WorkflowState } from "../../domain/entities/workflow-state";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import { WORKFLOW_STATE_REPOSITORY, WorkflowStateRepository } from "../../domain/ports/workflow-state.repository";
import { UpdateWorkflowStateInput } from "../dtos/update-workflow-state.input";
import { SALE_ORDER_STATES_REPOSITORY, SaleOrderStatesRepository } from "../../domain/ports/sale-order-states.repository";

export class UpdateWorkflowStateUseCase {
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

  async execute(input: UpdateWorkflowStateInput) {
    return this.uow.runInTransaction(async (tx) => {
      const workflow = await this.workflowRepo.findById(input.workflowId, tx);
      if (!workflow) {
        throw new NotFoundException("Workflow no encontrado");
      }

      const current = await this.workflowStateRepo.findById(input.stateId, tx);
      if (!current || current.workflowId !== input.workflowId) {
        throw new NotFoundException("Estado de workflow no encontrado");
      }

      const states = await this.workflowStateRepo.listByWorkflowId(input.workflowId, tx);
      const globalState = input.saleOrderStateId
        ? await this.saleOrderStatesRepo.findById(input.saleOrderStateId, tx)
        : {
            id: current.saleOrderStateId,
            code: current.code,
            name: current.name,
            color: current.color,
          };
      if (!globalState) {
        throw new NotFoundException("Estado global no encontrado");
      }
      if (states.some((state) => state.id !== current.id && state.saleOrderStateId === globalState.id)) {
        throw new BadRequestException("El estado global ya existe en el workflow");
      }

      const isInitial = input.isInitial ?? current.isInitial;
      const isActive = input.isActive ?? current.isActive;
      if (
        isInitial &&
        isActive &&
        states.some((state) => state.id !== current.id && state.isInitial && state.isActive)
      ) {
        throw new BadRequestException("Ya existe un estado inicial activo");
      }

      return this.workflowStateRepo.update(
        new WorkflowState({
          id: current.id,
          workflowId: current.workflowId,
          saleOrderStateId: globalState.id as string,
          code: globalState.code,
          name: globalState.name,
          color: globalState.color,
          position: input.position ?? current.position,
          positionX: input.positionX === undefined ? current.positionX : input.positionX,
          positionY: input.positionY === undefined ? current.positionY : input.positionY,
          isInitial,
          isFinal: input.isFinal ?? current.isFinal,
          isActive,
        }),
        tx,
      );
    });
  }
}
