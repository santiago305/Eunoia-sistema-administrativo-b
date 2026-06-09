export interface SaleOrderPdfData {
  company: {
    name: string;
    ruc?: string;
    address?: string;
    logoUrl?: string;
  };
  client: {
    name: string;
    document?: string;
    reference?: string;
  };
  warehouse: {
    name: string;
  };
  order: {
    documentType: string;
    serie?: string;
    number?: string;
    separator?: string;
    issuedAt?: Date;
    scheduleDate?: string | null;
    deliveryDate?: string | null;
    note?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    components?: Array<{ description: string; quantity: number }>;
  }>;
  totals: {
    subTotal: number;
    deliveryCost: number;
    total: number;
    totalPaid: number;
    pendingAmount: number;
  };
  payments: Array<{
    method: string;
    amount: number;
    date: Date;
    operationNumber?: string | null;
  }>;
}

