import { AddProductionOrderItemInput } from "../dto/production-order/input/add-production-order-item";
import { CreateProductionOrderInput } from "../dto/production-order/input/create-production-order";
import { ListProductionOrdersInput } from "../dto/production-order/input/list-production-orders";
import { UpdateProductionOrderInput } from "../dto/production-order/input/update-production-order";
import { UpdateProductionWasteInput } from "../dto/production-order/input/update-production-waste";

export class ProductionOrderHttpMapper {
  static toCreateInput(input: CreateProductionOrderInput): CreateProductionOrderInput {
    return {
      ...input,
      reference: input.reference?.trim() || undefined,
    };
  }

  static toListInput(input: ListProductionOrdersInput): ListProductionOrdersInput {
    return {
      ...input,
      warehouseId: input.warehouseId?.trim() || undefined,
    };
  }

  static toUpdateInput(
    productionId: string,
    input: Omit<UpdateProductionOrderInput, "productionId">,
  ): UpdateProductionOrderInput {
    return {
      ...input,
      productionId,
      reference: input.reference?.trim() || undefined,
    };
  }

  static toAddItemInput(
    productionId: string,
    input: Omit<AddProductionOrderItemInput, "productionId">,
  ): AddProductionOrderItemInput {
    return {
      ...input,
      productionId,
    };
  }

  static toWasteInput(productionId: string, input: Omit<UpdateProductionWasteInput, "productionId">): UpdateProductionWasteInput {
    return {
      ...input,
      productionId,
    };
  }
}
