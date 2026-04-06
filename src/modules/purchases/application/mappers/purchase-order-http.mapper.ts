import { CreatePurchaseOrderInput } from "../dtos/purchase-order/input/create.input";
import { ListPurchaseOrdersInput } from "../dtos/purchase-order/input/list.input";
import { SetPurchaseOrderActiveInput } from "../dtos/purchase-order/input/set-active.input";
import { UpdatePurchaseOrderInput } from "../dtos/purchase-order/input/update.input";

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
    return {
      ...input,
      number: input.number?.trim() || undefined,
    };
  }

  static toSetActiveInput(poId: string, isActive: boolean): SetPurchaseOrderActiveInput {
    return { poId, isActive };
  }
}
