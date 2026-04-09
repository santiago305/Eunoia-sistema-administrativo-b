import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { SUPPLIER_SKU_REPOSITORY, SupplierSkuRepository } from "src/modules/suppliers/domain/ports/supplier-sku.repository";
import { ListSupplierSkusInput } from "../../dtos/supplier-sku/input/list.input";
import { SupplierSkuOutput } from "../../dtos/supplier-sku/output/supplier-sku.output";
import { SupplierOutputMapper } from "../../mappers/supplier-output.mapper";

export class ListSupplierSkusUsecase {
  constructor(
    @Inject(SUPPLIER_SKU_REPOSITORY)
    private readonly supplierSkuRepo: SupplierSkuRepository,
  ) {}

  async execute(input: ListSupplierSkusInput): Promise<PaginatedResult<SupplierSkuOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.supplierSkuRepo.list({
      supplierId: input.supplierId,
      skuId: input.skuId,
      supplierSku: input.supplierSku,
      page,
      limit,
    });

    return {
      items: items.map((row) => SupplierOutputMapper.toSupplierSkuOutput(row)),
      total,
      page,
      limit,
    };
  }
}
