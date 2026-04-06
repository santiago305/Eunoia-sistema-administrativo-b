import { CreateSupplierInput } from "../dtos/supplier/input/create.input";
import { ListSuppliersInput } from "../dtos/supplier/input/list.input";
import { SetSupplierActiveInput } from "../dtos/supplier/input/set-active.input";
import { UpdateSupplierInput } from "../dtos/supplier/input/update.input";
import { CreateSupplierVariantInput } from "../dtos/supplier-variant/input/create.input";
import { ListSupplierVariantsInput } from "../dtos/supplier-variant/input/list.input";
import { UpdateSupplierVariantInput } from "../dtos/supplier-variant/input/update.input";

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
      documentNumber: input.documentNumber?.trim() || undefined,
      name: input.name?.trim() || undefined,
      lastName: input.lastName?.trim() || undefined,
      tradeName: input.tradeName?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      q: input.q?.trim() || undefined,
    };
  }

  static toSetActiveInput(supplierId: string, isActive: boolean): SetSupplierActiveInput {
    return { supplierId, isActive };
  }

  static toCreateSupplierVariantInput(dto: CreateSupplierVariantInput): CreateSupplierVariantInput {
    return {
      ...dto,
      supplierSku: dto.supplierSku?.trim() || undefined,
    };
  }

  static toUpdateSupplierVariantInput(
    supplierId: string,
    variantId: string,
    dto: Omit<UpdateSupplierVariantInput, "supplierId" | "variantId">,
  ): UpdateSupplierVariantInput {
    return {
      ...dto,
      supplierId,
      variantId,
      supplierSku: dto.supplierSku?.trim() || undefined,
    };
  }

  static toListSupplierVariantsInput(input: ListSupplierVariantsInput): ListSupplierVariantsInput {
    return {
      ...input,
      supplierSku: input.supplierSku?.trim() || undefined,
    };
  }
}
