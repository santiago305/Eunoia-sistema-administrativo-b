export interface ProductionOrderPdfData {
  company: {
    name: string;
    ruc?: string;
    address?: string;
    logoUrl?: string;
  };
  order: {
    documentType: string;
    serie?: string;
    number?: string;
    issuedAt?: Date;
    manufactureDate?: Date;
    status?: string;
    reference?: string;
    fromWarehouse?: string;
    toWarehouse?: string;
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
