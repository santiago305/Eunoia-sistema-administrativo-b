import { Inject } from '@nestjs/common';
import {
  WORKFLOW_REPOSITORY,
  WorkflowRepository,
} from '../../domain/ports/workflow.repository';

export class ListManagedWorkflowsUseCase {
  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
  ) {}

  execute() {
    return this.workflowRepo.listManaged?.() ?? this.workflowRepo.list();
  }
}
