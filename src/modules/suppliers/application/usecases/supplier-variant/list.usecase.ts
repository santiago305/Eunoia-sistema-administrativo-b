import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { SUPPLIER_VARIANT_REPOSITORY, SupplierVariantRepository } from "src/modules/suppliers/domain/ports/supplier-variant.repository";
import { ListSupplierVariantsInput } from "../../dtos/supplier-variant/input/list.input";
import { SupplierVariantOutput } from "../../dtos/supplier-variant/output/supplier-variant.output";
import { SupplierOutputMapper } from "../../mappers/supplier-output.mapper";

export class ListSupplierVariantsUsecase {
  constructor(
    @Inject(SUPPLIER_VARIANT_REPOSITORY)
    private readonly supplierVariantRepo: SupplierVariantRepository,
  ) {}

  async execute(input: ListSupplierVariantsInput): Promise<PaginatedResult<SupplierVariantOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.supplierVariantRepo.list({
      supplierId: input.supplierId,
      variantId: input.variantId,
      supplierSku: input.supplierSku,
      page,
      limit,
    });

    return {
      items: items.map((row) => SupplierOutputMapper.toSupplierVariantOutput(row)),
      total,
      page,
      limit,
    };
  }
}
