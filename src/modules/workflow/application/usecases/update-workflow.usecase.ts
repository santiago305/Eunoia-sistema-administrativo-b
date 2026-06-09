import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Workflow } from "../../domain/entities/workflow";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import { UpdateWorkflowInput } from "../dtos/update-workflow.input";

export class UpdateWorkflowUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdateWorkflowInput) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.workflowRepo.findById(input.workflowId, tx);
      if (!current) {
        throw new NotFoundException("Workflow no encontrado");
      }

      const name = input.name?.trim() || current.name;
      if (!name) {
        throw new BadRequestException("Nombre de workflow es obligatorio");
      }

      const workflow = new Workflow({
        id: current.id,
        name,
        normalizedName: this.normalizeName(name),
        description: input.description === undefined ? current.description : input.description,
        isActive: input.isActive ?? current.isActive,
        createdAt: current.createdAt,
        updatedAt: this.clock.now(),
      });

      return this.workflowRepo.update(workflow, tx);
    });
  }

  private normalizeName(value: string) {
    return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
  }
}
