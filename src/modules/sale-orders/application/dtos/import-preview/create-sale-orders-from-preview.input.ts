export type SaleOrderImportPreviewCleanRow = {
  productName?: unknown;
  orderDate?: unknown;
  deliveryDate?: unknown;
  workflowName?: unknown;
  departmentName?: unknown;
  provinceName?: unknown;
  districtName?: unknown;
  recipientName?: unknown;
  address?: unknown;
  deliveryNote?: unknown;
  phone?: unknown;
  couponCode?: unknown;
  productCodes?: unknown;
  quantity?: unknown;
  total?: unknown;
  advance?: unknown;
  codAmount?: unknown;
  internalNote?: unknown;
  confirmedBy?: unknown;
  deliveryCost?:unknown;
};

export type SaleOrderImportPreviewNormalizedSku = {
  productId: string;
  skuId: string;
  skuName: string;
  customSku: string;
  quantity: number;
};

export type SaleOrderImportPreviewResultRow = {
  rowNumber: number;
  clientId: string;
  sourceId: string;
  saleOrderId: string;
  skus: SaleOrderImportPreviewNormalizedSku[];
};

export type SaleOrderImportPreviewErrorRow = {
  rowNumber: number;
  message: string;
};

export type CreateSaleOrdersFromImportPreviewInput = {
  rows: SaleOrderImportPreviewCleanRow[];
};

export type CreateSaleOrdersFromImportPreviewOutput = {
  totalRows: number;
  processedRows: number;
  importedRows: number;
  failedRows: number;
  rows: SaleOrderImportPreviewResultRow[];
  errors: SaleOrderImportPreviewErrorRow[];
};

