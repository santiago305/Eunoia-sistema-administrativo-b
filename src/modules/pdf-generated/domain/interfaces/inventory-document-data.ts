export interface InventoryDocumentPdfData {
  company: {
    name: string;
    ruc?: string;
    address?: string;
    logoUrl?: string;
  };
  document: {
    documentType: string;
    serie?: string;
    number?: string;
    separator?: string;
    issuedAt?: Date;
    postedAt?: Date;
    status?: string;
    fromWarehouse?: string;
    toWarehouse?: string;
    reference?: string;
  };
  items: Array<{
    description: string;
    unit: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
  totals: {
    totalCost: number;
  };
  note?: string;
}
