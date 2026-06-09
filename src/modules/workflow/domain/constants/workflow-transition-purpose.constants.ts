export const TRANSITION_PURPOSES = {
  STANDARD: "STANDARD",
  CANCEL: "CANCEL",
} as const;

export type WorkflowTransitionPurpose =
  typeof TRANSITION_PURPOSES[keyof typeof TRANSITION_PURPOSES];
