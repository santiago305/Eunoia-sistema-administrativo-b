export interface PurchaseOrderPdfData {
  company: {
    name: string;
    ruc?: string;
    address?: string;
    logoUrl?: string;
  };
  supplier: {
    name: string;
    documentType?: string;
    document?: string;
    address?: string;
  };
  order: {
    documentType: string;
    serie?: string;
    number?: string;
    issuedAt?: Date;
    expectedAt?: Date;
    currency?: string;
    paymentForm?: string;
    creditDays?: number;
    status?: string;
  };
  items: Array<{
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totals: {
    taxed: number;
    exempted: number;
    igv: number;
    total: number;
    igvPercentage?: number;
  };
  note?: string;
}