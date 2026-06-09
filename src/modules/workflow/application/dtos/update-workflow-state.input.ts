export type UpdateWorkflowStateInput = {
  workflowId: string;
  stateId: string;
  saleOrderStateId?: string;
  position?: number;
  positionX?: number | null;
  positionY?: number | null;
  isInitial?: boolean;
  isFinal?: boolean;
  isActive?: boolean;
};
