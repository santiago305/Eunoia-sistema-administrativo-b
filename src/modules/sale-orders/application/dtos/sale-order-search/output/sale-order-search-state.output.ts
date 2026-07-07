import {
  ListingSearchMetricOutput,
  ListingSearchOptionOutput,
  ListingSearchRecentOutput,
} from "src/shared/listing-search/application/dtos/listing-search-state.output";
import {
  SaleOrderSearchSnapshot,
  SaleOrderWorkflowOutput,
  SaleOrderWorkflowStateOutput,
} from "../sale-order-search-snapshot";
import { SaleOrderPaymentStatus } from "../input/save-sale-order-search-metric.input";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { SaleOrderEditPolicy } from "src/modules/sale-orders/application/services/sale-order-edit-policy.service";
import { SaleOrderAttachmentType } from "src/modules/sale-order-attachments/domain/value-objects/sale-order-attachment-type";

export interface SaleOrderSearchStateOutput {
  recent: ListingSearchRecentOutput<SaleOrderSearchSnapshot>[];
  saved: ListingSearchMetricOutput<SaleOrderSearchSnapshot>[];
  catalogs: {
    clients: ListingSearchOptionOutput[];
    warehouses: ListingSearchOptionOutput[];
    paymentStatuses: ListingSearchOptionOutput[];
    workflows: ListingSearchOptionOutput[];
    states: ListingSearchOptionOutput[];
    bankAccounts: ListingSearchOptionOutput[];
    clientTypes: ListingSearchOptionOutput[];
    departments: ListingSearchOptionOutput[];
    provinces: ListingSearchOptionOutput[];
    districts: ListingSearchOptionOutput[];
    sources: ListingSearchOptionOutput[];
    invoiceStatuses: ListingSearchOptionOutput[];
  };
}
export type SaleOrderItemComponentOutput = {
  id: string;
  saleOrderItemId: string;
  sku: {
    id: string;
    productId: string;
    name: string;
    backendSku: string;
    customSku: string | null;
    barcode: string | null;
    image: string | null;
    price: number;
    cost: number;
    isSellable: boolean;
    isPurchasable: boolean;
    isManufacturable: boolean;
    isStockTracked: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
  };
  unit: { id: string; name: string; code: string } | null;
  attributes: Array<{ code: string; name: string | null; value: string }>;
  stockItemId: string | null;
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
  client: {
    id: string;
    type: ClientType;
    docType: ClientDocType;
    fullName: string;
    docNumber: string | null;
    address: string | null;
    isActive: boolean;

    departmentId: string | null;
    provinceId: string | null;
    districtId: string | null;

    department: {
      id: string;
      name: string;
    } | null;

    province: {
      id: string;
      name: string;
      departmentId: string;
    } | null;

    district: {
      id: string;
      name: string;
      provinceId: string;
    } | null;

    reference: string | null;
    mainPhone: string | null;
    telephones: Array<{
      id: string;
      number: string;
      isMain: boolean;
      isActive: boolean;
    }>;
  } | null;
  agencySubsidiaryId: string | null;
  source: { id: string; name: string; detail?: string | null } | null;
  scheduleDate: string | null;
  deliveryDate: string | null;
  subTotal: number;
  deliveryCost: number;
  discount: number;
  total: number;
  note: string | null;
  advertisingCode: string | null;
  observation: string | null;
  sendDate: string | null;
  sendPhoto: string | null;
  sendCode: string | null;
  sendAddress: string | null;
  assignedBy: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string } | null;
  workflow: SaleOrderWorkflowOutput | null;
  currentState: SaleOrderWorkflowStateOutput | null;
  invoiceSend: boolean;
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
      sku: SaleOrderItemComponentOutput["sku"];
      unit: SaleOrderItemComponentOutput["unit"];
      attributes: SaleOrderItemComponentOutput["attributes"];
      stockItemId: string | null;
      referencePackItemId: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
      createdAt: string;
    }>;
  }>;
  payments: Array<{
    id: string;
    clientKey: string;
    bankAccount: { id: string; name: string; number?: string | null } | null;
    date: string;
    method: string;
    operationNumber: string | null;
    amount: number;
    note: string | null;
    paymentPhoto: string | null;
    createdAt: string;
  }>;
  attachments: Array<{
    id: string;
    saleOrderPaymentId: string | null;
    type: SaleOrderAttachmentType;
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    note: string | null;
    createdAt: string;
  }>;
  editPolicy: SaleOrderEditPolicy;
  totalPaid: number;
  pendingAmount: number;
  paymentStatus: SaleOrderPaymentStatus;
};
