export type SaleOrderImportLoteOutput = {
  id: string;
  lote: number;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string | null };
  isActive: boolean;
};

export type SaleOrderImportLoteAuditOutput = {
  id: string;
  loteId: string;
  createdAt: string;
  executedBy: { id: string; name: string | null; email: string | null };
  actionExecution: "delete" | "restore";
};
