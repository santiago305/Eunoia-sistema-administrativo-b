export const WORKFLOW_LIFECYCLE = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type WorkflowLifecycleStatus =
  (typeof WORKFLOW_LIFECYCLE)[keyof typeof WORKFLOW_LIFECYCLE];
