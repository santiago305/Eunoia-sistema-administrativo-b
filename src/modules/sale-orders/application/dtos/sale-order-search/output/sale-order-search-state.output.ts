import {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import { SaleOrderSearchSnapshot } from "../sale-order-search-snapshot";
import { SaleOrderPaymentStatus } from "../input/save-sale-order-search-metric.input";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";

export interface SaleOrderSearchStateOutput {
  recent: ListingSearchRecentOutput<SaleOrderSearchSnapshot>[];
  saved: ListingSearchMetricOutput<SaleOrderSearchSnapshot>[];
  catalogs: {
    clients: ListingSearchOptionOutput[];
    warehouses: ListingSearchOptionOutput[];
    agendaStatuses: ListingSearchOptionOutput[];
    deliveryStatuses: ListingSearchOptionOutput[];
    deliveryTypes: ListingSearchOptionOutput[];
    paymentStatuses: ListingSearchOptionOutput[];
  };
}
export type SaleOrderItemComponentOutput = {
  id: string;
  saleOrderItemId: string;
  sku: { id: string; name: string; backendSku: string; customSku: string | null; barcode: string | null };
  referencePackItemId: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
};

export type SaleOrderComponentsOutput = {
  saleOrderId: string;
  items: Array<{
    saleOrderItemId: string;
    components: SaleOrderItemComponentOutput[];
  }>;
};
export type SaleOrderGetOutput = {
  id: string;
  serie: string | null;
  correlative: number | null;
  warehouse: { id: string; name: string } | null;
  client: { id: string; type?: ClientType | null; fullName: string; docNumber?: string | null; reference?: string | null } | null;
  agencyDetail: string | null;
  source: { id: string; name: string; detail?: string | null } | null;
  scheduleDate: string | null;
  deliveryDate: string | null;
  deliveryType: string | null;
  subTotal: number;
  deliveryCost: number;
  total: number;
  note: string | null;
  createdBy: { id: string; name: string; email: string } | null;
  agendaStatus: string;
  deliveryStatus: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  items: Array<{
    id: string;
    referencePackId: string | null;
    description: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
    createdAt: string;
    components: Array<{
      id: string;
      saleOrderItemId: string;
      sku: { id: string; name: string; backendSku: string; customSku: string | null; barcode: string | null };
      referencePackItemId: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
      createdAt: string;
    }>;
  }>;
  payments: Array<{
    id: string;
    bankAccount: { id: string; name: string; number?: string | null } | null;
    date: string;
    method: string;
    operationNumber: string | null;
    amount: number;
    note: string | null;
    createdAt: string;
  }>;
  totalPaid: number;
  pendingAmount: number;
  paymentStatus: SaleOrderPaymentStatus;
};