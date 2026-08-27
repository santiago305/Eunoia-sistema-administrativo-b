import { ConflictException } from '@nestjs/common';
import { WORKFLOW_LIFECYCLE } from '../domain/constants/workflow-lifecycle.constants';
import { Workflow } from '../domain/entities/workflow';

export function assertWorkflowDraft(workflow: Workflow): void {
  if (workflow.lifecycleStatus !== WORKFLOW_LIFECYCLE.DRAFT) {
    throw new ConflictException(
      'Las revisiones publicadas son historicas. Cree o edite un borrador.',
    );
  }
}
