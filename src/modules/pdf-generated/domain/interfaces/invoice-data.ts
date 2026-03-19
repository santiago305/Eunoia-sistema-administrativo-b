export interface InvoicePdfData {
  company: {
    name: string;
    ruc?: string;
    address?: string;
    logoUrl?: string;
  };
  client: {
    name: string;
    document?: string;
  };
  document: {
    type: string;
    serie: string;
    number: string;
    issuedAt: Date;
    currency: string;
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
    igv: number;
    total: number;
    igvPercentage: number;
    legend?: string;
    additionalInfo?: string;
  };
}
