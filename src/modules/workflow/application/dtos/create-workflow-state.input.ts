export type CreateWorkflowStateInput = {
  workflowId: string;
  saleOrderStateId: string;
  position?: number;
  positionX?: number | null;
  positionY?: number | null;
  isInitial?: boolean;
  isFinal?: boolean;
  isActive?: boolean;
};
