export type UpdateWorkflowInput = {
  workflowId: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
};
