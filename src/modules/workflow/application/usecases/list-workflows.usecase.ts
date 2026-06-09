import { Inject } from "@nestjs/common";
import { WORKFLOW_REPOSITORY, WorkflowRepository } from "../../domain/ports/workflow.repository";

export class ListWorkflowsUseCase {
  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
  ) {}

  async execute() {
    return this.workflowRepo.list?.();
  }
}
