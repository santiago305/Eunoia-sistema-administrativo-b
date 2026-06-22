export interface ListPaymentsInput {
  poId?: string;
  quotaId?: string;
  status?: "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  page?: number;
  limit?: number;
}
