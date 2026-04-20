import { CreatePurchaseOrderInput } from "../dtos/purchase-order/input/create.input";
import { ListPurchaseOrdersInput } from "../dtos/purchase-order/input/list.input";
import { SetPurchaseOrderActiveInput } from "../dtos/purchase-order/input/set-active.input";
import { UpdatePurchaseOrderInput } from "../dtos/purchase-order/input/update.input";
import {
  sanitizePurchaseSearchFilters,
} from "../support/purchase-search.utils";

export class PurchaseOrderHttpMapper {
  static toCreateInput(dto: CreatePurchaseOrderInput): CreatePurchaseOrderInput {
    return {
      ...dto,
      serie: dto.serie?.trim(),
      note: dto.note?.trim() || undefined,
    };
  }

  static toUpdateInput(
    poId: string,
    dto: Omit<UpdatePurchaseOrderInput, "poId">,
  ): UpdatePurchaseOrderInput {
    return {
      ...dto,
      poId,
      serie: dto.serie?.trim(),
      note: dto.note?.trim() || undefined,
    };
  }

  static toListInput(input: ListPurchaseOrdersInput): ListPurchaseOrdersInput {
    const mergedFilters = sanitizePurchaseSearchFilters({
      supplierIds: [
        ...(input.supplierIds ?? []),
        ...(input.supplierId ? [input.supplierId] : []),
      ],
      warehouseIds: [
        ...(input.warehouseIds ?? []),
        ...(input.warehouseId ? [input.warehouseId] : []),
      ],
      statuses: [
        ...(input.statuses ?? []),
        ...(input.status ? [input.status] : []),
      ],
      documentTypes: [
        ...(input.documentTypes ?? []),
        ...(input.documentType ? [input.documentType] : []),
      ],
      paymentForms: input.paymentForms ?? [],
    });

    return {
      ...input,
      number: input.number?.trim() || undefined,
      q: input.q?.trim() || undefined,
      supplierIds: mergedFilters.supplierIds,
      warehouseIds: mergedFilters.warehouseIds,
      statuses: mergedFilters.statuses,
      documentTypes: mergedFilters.documentTypes,
      paymentForms: mergedFilters.paymentForms,
    };
  }

  static toSetActiveInput(poId: string, isActive: boolean): SetPurchaseOrderActiveInput {
    return { poId, isActive };
  }
}
