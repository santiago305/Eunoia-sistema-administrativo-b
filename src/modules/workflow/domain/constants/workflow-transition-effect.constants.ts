export const TRANSITION_EFFECTS = {
  MOVE_STATE: "MOVE_STATE",
  RUN_ACTIONS: "RUN_ACTIONS",
} as const;

export type WorkflowTransitionEffect =
  typeof TRANSITION_EFFECTS[keyof typeof TRANSITION_EFFECTS];
