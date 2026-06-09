import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Workflow } from "../../domain/entities/workflow";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import { TRANSITION_PURPOSES } from "../../domain/constants/workflow-transition-purpose.constants";

export class ActivateWorkflowUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: { workflowId: string }) {
    return this.uow.runInTransaction(async (tx) => {
      const aggregate = await this.workflowRepo.findDetailedById(input.workflowId, tx);
      if (!aggregate) {
        throw new NotFoundException("Workflow no encontrado");
      }

      const activeStates = aggregate.states.filter((state) => state.isActive);
      const initialStates = activeStates.filter((state) => state.isInitial);
      if (initialStates.length !== 1) {
        throw new BadRequestException("El workflow debe tener exactamente un estado inicial activo");
      }
      if (!activeStates.some((state) => state.isFinal)) {
        throw new BadRequestException("El workflow debe tener al menos un estado final activo");
      }

      for (const transition of aggregate.transitions.filter((item) => item.isActive)) {
        if (transition.purpose === TRANSITION_PURPOSES.CANCEL && !transition.isGlobal) {
          throw new BadRequestException("La transicion de cancelacion debe ser global");
        }
        if (!transition.isGlobal && !activeStates.some((state) => state.id === transition.fromStateId)) {
          throw new BadRequestException("Transicion con estado origen inactivo o inexistente");
        }
        if (!activeStates.some((state) => state.id === transition.toStateId)) {
          throw new BadRequestException("Transicion con estado destino inactivo o inexistente");
        }
        if (
          transition.purpose === TRANSITION_PURPOSES.CANCEL &&
          activeStates.some((state) => state.id === transition.toStateId && state.isFinal)
        ) {
          throw new BadRequestException("El estado destino de cancelacion no puede ser final");
        }
      }

      const workflow = new Workflow({
        id: aggregate.workflow.id,
        name: aggregate.workflow.name,
        normalizedName: aggregate.workflow.normalizedName,
        description: aggregate.workflow.description,
        isActive: true,
        createdAt: aggregate.workflow.createdAt,
        updatedAt: this.clock.now(),
      });

      return this.workflowRepo.update(workflow, tx);
    });
  }
}
