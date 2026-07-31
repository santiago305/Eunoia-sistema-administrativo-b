export type SaleOrderAuditOutput = {
  id: string;
  saleOrderId: string;
  createdAt: string;
  executedBy: { id: string; name: string | null; email: string | null };
  actionExecution: "delete" | "restore" | "preguide_on" | "preguide_off" | "prepared_on" | "prepared_off";
};
