import { Inject, NotFoundException } from "@nestjs/common";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";

export class GetWorkflowUseCase {
  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
  ) {}

  async execute(input: { workflowId: string }) {
    const workflow = await this.workflowRepo.findDetailedById(input.workflowId);
    if (!workflow) {
      throw new NotFoundException("Workflow no encontrado");
    }

    return workflow;
  }
}
