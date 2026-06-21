export interface ListPaymentsInput {
  poId?: string;
  quotaId?: string;
  status?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  page?: number;
  limit?: number;
}
