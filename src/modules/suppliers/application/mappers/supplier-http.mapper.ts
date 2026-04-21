import { CreateSupplierInput } from "../dtos/supplier/input/create.input";
import { ListSuppliersInput } from "../dtos/supplier/input/list.input";
import { SetSupplierActiveInput } from "../dtos/supplier/input/set-active.input";
import { UpdateSupplierInput } from "../dtos/supplier/input/update.input";
import { CreateSupplierSkuInput } from "../dtos/supplier-sku/input/create.input";
import { ListSupplierSkusInput } from "../dtos/supplier-sku/input/list.input";
import { UpdateSupplierSkuInput } from "../dtos/supplier-sku/input/update.input";
import { sanitizeSupplierSearchFilters } from "../support/supplier-search.utils";

export class SupplierHttpMapper {
  static toCreateSupplierInput(dto: CreateSupplierInput): CreateSupplierInput {
    return {
      ...dto,
      documentNumber: dto.documentNumber.trim(),
      name: dto.name?.trim() || undefined,
      lastName: dto.lastName?.trim() || undefined,
      tradeName: dto.tradeName?.trim() || undefined,
      address: dto.address?.trim() || undefined,
      phone: dto.phone?.trim() || undefined,
      email: dto.email?.trim() || undefined,
      note: dto.note?.trim() || undefined,
    };
  }

  static toUpdateSupplierInput(
    supplierId: string,
    dto: Omit<UpdateSupplierInput, "supplierId">,
  ): UpdateSupplierInput {
    return {
      ...dto,
      supplierId,
      documentNumber: dto.documentNumber?.trim() || undefined,
      name: dto.name?.trim() || undefined,
      lastName: dto.lastName?.trim() || undefined,
      tradeName: dto.tradeName?.trim() || undefined,
      address: dto.address?.trim() || undefined,
      phone: dto.phone?.trim() || undefined,
      email: dto.email?.trim() || undefined,
      note: dto.note?.trim() || undefined,
    };
  }

  static toListSuppliersInput(input: ListSuppliersInput): ListSuppliersInput {
    return {
      ...input,
      q: input.q?.trim() || undefined,
      filters: sanitizeSupplierSearchFilters({
        documentTypes: input.documentType ? [input.documentType] : [],
        isActiveValues:
          input.isActive === undefined ? [] : [input.isActive ? "true" : "false"],
        documentNumber: input.documentNumber?.trim(),
        name: input.name?.trim(),
        lastName: input.lastName?.trim(),
        tradeName: input.tradeName?.trim(),
        phone: input.phone?.trim(),
        email: input.email?.trim(),
      }).concat(sanitizeSupplierSearchFilters(input.filters)),
      documentType: undefined,
      isActive: undefined,
      documentNumber: undefined,
      name: undefined,
      lastName: undefined,
      tradeName: undefined,
      phone: undefined,
      email: undefined,
    };
  }

  static toSetActiveInput(supplierId: string, isActive: boolean): SetSupplierActiveInput {
    return { supplierId, isActive };
  }

  static toCreateSupplierSkuInput(dto: CreateSupplierSkuInput): CreateSupplierSkuInput {
    return {
      ...dto,
      supplierSku: dto.supplierSku?.trim() || undefined,
    };
  }

  static toUpdateSupplierSkuInput(
    supplierId: string,
    skuId: string,
    dto: Omit<UpdateSupplierSkuInput, "supplierId" | "skuId">,
  ): UpdateSupplierSkuInput {
    return {
      ...dto,
      supplierId,
      skuId,
      supplierSku: dto.supplierSku?.trim() || undefined,
    };
  }

  static toListSupplierSkusInput(input: ListSupplierSkusInput): ListSupplierSkusInput {
    return {
      ...input,
      supplierSku: input.supplierSku?.trim() || undefined,
    };
  }
}
