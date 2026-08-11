import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { SaleOrderSupplyItem } from '../entities/sale-order-supply-item';

export const SALE_ORDER_SUPPLY_ITEM_REPOSITORY = Symbol('SALE_ORDER_SUPPLY_ITEM_REPOSITORY');

export type SaleOrderSupplyCatalogItem = {
  supplySkuId: string;
  isActiveSupply: boolean;
  supplyName: string;
  skuName: string;
  backendSku: string;
  customSku: string | null;
};

export type SaleOrderSupplyUnit = { unitId: string; unitName: string; unitCode: string };
export type SaleOrderSupplyRecipeItem = {
  recipeItemId: string;
  supplySkuId: string;
  quantity: number;
  unitId: string;
};
export type ReplaceSaleOrderSupplyItem = {
  supplySkuId: string;
  quantity: number;
  unitId: string;
  referenceRecipeItemId: string | null;
  supplyNameSnapshot: string;
  skuNameSnapshot: string;
  backendSkuSnapshot: string;
  customSkuSnapshot: string | null;
  unitNameSnapshot: string;
  unitCodeSnapshot: string;
};

export interface SaleOrderSupplyItemRepository {
  saleOrderExists(saleOrderId: string, tx?: TransactionContext): Promise<boolean>;
  listBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderSupplyItem[]>;
  findCatalogItems(supplySkuIds: string[], unitIds: string[], tx?: TransactionContext): Promise<{
    supplies: SaleOrderSupplyCatalogItem[];
    units: SaleOrderSupplyUnit[];
  }>;
  findRecipeItemsByWorkflowId(workflowId: string, tx?: TransactionContext): Promise<SaleOrderSupplyRecipeItem[]>;
  findRecipeItemsByIds(recipeItemIds: string[], tx?: TransactionContext): Promise<SaleOrderSupplyRecipeItem[]>;
  replace(saleOrderId: string, items: ReplaceSaleOrderSupplyItem[], tx?: TransactionContext): Promise<SaleOrderSupplyItem[]>;
}
