export const MESSAGE_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  FAILED: 'FAILED',
  SCHEDULED: 'SCHEDULED',
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

