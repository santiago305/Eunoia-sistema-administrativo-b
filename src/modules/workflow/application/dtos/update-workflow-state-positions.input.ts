export type UpdateWorkflowStatePositionsInput = {
  workflowId: string;
  positions: Array<{
    stateId: string;
    positionX: number | null;
    positionY: number | null;
  }>;
};
