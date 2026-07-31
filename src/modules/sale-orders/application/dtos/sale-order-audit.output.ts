export type SaleOrderAuditOutput = {
  id: string;
  saleOrderId: string;
  createdAt: string;
  executedBy: { id: string; name: string | null; email: string | null };
  actionExecution: "delete" | "restore";
};
