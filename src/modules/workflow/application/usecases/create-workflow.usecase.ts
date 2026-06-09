import { BadRequestException, Inject } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { Workflow } from "../../domain/entities/workflow";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";
import { CreateWorkflowInput } from "../dtos/create-workflow.input";

export class CreateWorkflowUseCase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateWorkflowInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException("Nombre de workflow es obligatorio");
    }

    return this.uow.runInTransaction(async (tx) => {
      const workflow = new Workflow({
        id: crypto.randomUUID(),
        name,
        normalizedName: this.normalizeName(name),
        description: input.description ?? null,
        isActive: false,
        createdAt: this.clock.now(),
        updatedAt: null,
      });

      return this.workflowRepo.create(workflow, tx);
    });
  }

  private normalizeName(value: string) {
    return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
  }
}
