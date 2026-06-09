import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { WorkflowState } from "../../domain/entities/workflow-state";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import { WORKFLOW_STATE_REPOSITORY, WorkflowStateRepository } from "../../domain/ports/workflow-state.repository";
import { UpdateWorkflowStatePositionsInput } from "../dtos/update-workflow-state-positions.input";

export class UpdateWorkflowStatePositionsUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(WORKFLOW_STATE_REPOSITORY)
    private readonly workflowStateRepo: WorkflowStateRepository,
  ) {}

  async execute(input: UpdateWorkflowStatePositionsInput) {
    return this.uow.runInTransaction(async (tx) => {
      const workflow = await this.workflowRepo.findById(input.workflowId, tx);
      if (!workflow) {
        throw new NotFoundException("Workflow no encontrado");
      }

      const requestedIds = input.positions.map((position) => position.stateId);
      if (new Set(requestedIds).size !== requestedIds.length) {
        throw new BadRequestException("No se permiten estados duplicados");
      }

      const states = await this.workflowStateRepo.listByWorkflowId(input.workflowId, tx);
      const statesById = new Map(states.map((state) => [state.id, state]));
      const missingStateId = requestedIds.find((stateId) => !statesById.has(stateId));
      if (missingStateId) {
        throw new NotFoundException(`Estado de workflow no encontrado: ${missingStateId}`);
      }

      const updatedStates = input.positions.map((position) => {
        const current = statesById.get(position.stateId)!;
        return new WorkflowState({
          id: current.id,
          workflowId: current.workflowId,
          saleOrderStateId: current.saleOrderStateId,
          code: current.code,
          name: current.name,
          color: current.color,
          position: current.position,
          positionX: position.positionX,
          positionY: position.positionY,
          isInitial: current.isInitial,
          isFinal: current.isFinal,
          isActive: current.isActive,
        });
      });

      return this.workflowStateRepo.updatePositions(updatedStates, tx);
    });
  }
}
