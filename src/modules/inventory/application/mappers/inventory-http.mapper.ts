import { CreateDocumentSerieInput } from "../dto/document-serie/input/create-document-serie";
import { GetActiveDocumentSerieInput } from "../dto/document-serie/input/get-active-document-serie";
import { SetDocumentSerieInput } from "../dto/document-serie/input/set-active-document-serie";
import { CreateAddItemPostAdjustmentInput } from "../dto/document/input/create-add-item-post-adjustment";
import { CreateAddItemPostOutInput } from "../dto/document/input/create-add-item-post-out";
import { CreateAddItemPostTransferInput } from "../dto/document/input/create-add-item-post-transfer";
import { CreateDocumentInput } from "../dto/document/input/document-create";
import { DocumentIdInput } from "../dto/document/input/document-id";
import { ListDocumentsInput } from "../dto/document/input/document-list";
import { PostDocumentInput } from "../dto/document/input/document-post";
import { AddItemInput } from "../dto/document-item/input/add-item";
import { ListDocumentItemsInput } from "../dto/document-item/input/get-items-by-id-document";
import { UpdateItemInput } from "../dto/document-item/input/item-update";
import { RemoveItemInput } from "../dto/document-item/output/item-remove";
import { GetAvailabilityInput } from "../dto/inventory/input/get-availability";
import { GetStockInput } from "../dto/inventory/input/get-stock";
import { ListInventoryInput } from "../dto/inventory/input/list-inventory";
import { GetLedgerDailyTotalsInput } from "../dto/ledger/input/get-ledger-daily-totals";
import { GetLedgerInput } from "../dto/ledger/input/get-ledger";
import { GetSalesTotalsInput } from "../dto/analytics/input/get-sales-totals";
import { GetDemandSummaryInput } from "../dto/analytics/input/get-demand-summary";
import { GetMonthlyProjectionInput } from "../dto/analytics/input/get-monthly-projection";

export class InventoryHttpMapper {
  static toListInventoryInput(input: ListInventoryInput): ListInventoryInput {
    return {
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId,
      locationId: input.locationId,
      search: input.search?.trim() || undefined,
      type: input.type,
      page: input.page,
      limit: input.limit,
    };
  }

  static toAvailabilityInput(input: GetAvailabilityInput): GetAvailabilityInput {
    return {
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId,
      locationId: input.locationId,
    };
  }

  static toGetStockInput(input: GetStockInput): GetStockInput {
    return {
      warehouseId: input.warehouseId || undefined,
      itemId: input.itemId || undefined,
      stockItemId: input.stockItemId || undefined,
      locationId: input.locationId,
    };
  }

  static toGetLedgerInput(input: GetLedgerInput): GetLedgerInput {
    return {
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId,
      locationId: input.locationId,
      from: input.from,
      to: input.to,
      docId: input.docId,
      page: input.page,
      limit: input.limit,
    };
  }

  static toGetLedgerDailyTotalsInput(input: GetLedgerDailyTotalsInput): GetLedgerDailyTotalsInput {
    return {
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId,
      locationId: input.locationId,
      from: input.from,
      to: input.to,
      docId: input.docId,
    };
  }

  static toGetSalesTotalsInput(input: GetSalesTotalsInput): GetSalesTotalsInput {
    return {
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId,
      locationId: input.locationId,
      from: input.from,
      to: input.to,
      docId: input.docId,
      month: input.month,
    };
  }

  static toGetDemandSummaryInput(input: GetDemandSummaryInput): GetDemandSummaryInput {
    return {
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId,
      locationId: input.locationId,
      from: input.from,
      to: input.to,
      windowDays: input.windowDays,
      horizonDays: input.horizonDays,
    };
  }

  static toGetMonthlyProjectionInput(input: GetMonthlyProjectionInput): GetMonthlyProjectionInput {
    return {
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId,
      locationId: input.locationId,
      to: input.to,
      months: input.months,
    };
  }

  static toCreateDocumentSerieInput(input: CreateDocumentSerieInput): CreateDocumentSerieInput {
    return {
      ...input,
      code: input.code?.trim(),
      name: input.name?.trim(),
      separator: input.separator?.trim() || "-",
    };
  }

  static toGetActiveDocumentSerieInput(input: GetActiveDocumentSerieInput): GetActiveDocumentSerieInput {
    return {
      docType: input.docType,
      warehouseId: input.warehouseId,
      isActive: input.isActive,
    };
  }

  static toSetDocumentSerieInput(id: string, isActive: boolean): SetDocumentSerieInput {
    return { id, isActive };
  }

  static toListDocumentsInput(input: ListDocumentsInput): ListDocumentsInput {
    return {
      ...input,
      warehouseId: input.warehouseId?.trim() || undefined,
    };
  }

  static toDocumentIdInput(docId: string): DocumentIdInput {
    return { docId };
  }

  static toCreateDocumentInput(input: CreateDocumentInput, createdBy: string): CreateDocumentInput {
    return {
      ...input,
      createdBy,
      note: input.note?.trim() || undefined,
    };
  }

  static toPostDocumentInput(docId: string, postedBy: string, note?: string): PostDocumentInput {
    return {
      docId,
      postedBy,
      note: note?.trim() || undefined,
    };
  }

  static toCreateAddItemPostOutInput(
    input: CreateAddItemPostOutInput,
    createdBy: string,
  ): CreateAddItemPostOutInput {
    return {
      ...input,
      createdBy,
      note: input.note?.trim() || undefined,
    };
  }

  static toCreateAddItemPostAdjustmentInput(
    input: CreateAddItemPostAdjustmentInput,
    createdBy: string,
  ): CreateAddItemPostAdjustmentInput {
    return {
      ...input,
      createdBy,
      note: input.note?.trim() || undefined,
    };
  }

  static toCreateAddItemPostTransferInput(
    input: CreateAddItemPostTransferInput,
    createdBy: string,
  ): CreateAddItemPostTransferInput {
    return {
      ...input,
      createdBy,
      note: input.note?.trim() || undefined,
    };
  }

  static toListDocumentItemsInput(docId: string): ListDocumentItemsInput {
    return { docId };
  }

  static toAddItemInput(docId: string, input: Omit<AddItemInput, "docId">): AddItemInput {
    return {
      ...input,
      docId,
    };
  }

  static toUpdateItemInput(
    docId: string,
    itemId: string,
    input: Omit<UpdateItemInput, "docId" | "itemId">,
  ): UpdateItemInput {
    return {
      ...input,
      docId,
      itemId,
    };
  }

  static toRemoveItemInput(docId: string, itemId: string): RemoveItemInput {
    return { docId, itemId };
  }
}
