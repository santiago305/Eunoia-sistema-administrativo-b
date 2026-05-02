export interface ProductionStatusFilterOption {
  value: string;
  label: string;
  active: boolean;
  order: number;
  color: string;
}

export interface ProductionWarehouseFilterOption {
  value: string;
  label: string;
  active: boolean;
}

export interface ProductionProductFilterOption {
  value: string;
  label: string;
  active: boolean;
  sku: string;
  skuId: string;
  stockItemId: string | null;
  backendSku: string;
  customSku: string | null;
  name: string;
  productId: string;
  productName: string;
  hasStockItem: boolean;
}

export interface ProductionUserFilterOption {
  value: string;
  label: string;
  active: boolean;
}

export interface ProductionFilterOptionsOutput {
  statuses: ProductionStatusFilterOption[];
  warehouses: ProductionWarehouseFilterOption[];
  products: ProductionProductFilterOption[];
  users: ProductionUserFilterOption[];
}

export const PRODUCTION_FILTER_OPTIONS_REPOSITORY = Symbol("PRODUCTION_FILTER_OPTIONS_REPOSITORY");

export interface ProductionFilterOptionsRepository {
  getOptions(): Promise<Omit<ProductionFilterOptionsOutput, "statuses">>;
}
