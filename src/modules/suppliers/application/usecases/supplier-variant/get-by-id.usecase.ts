import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { SUPPLIER_VARIANT_REPOSITORY, SupplierVariantRepository } from "src/modules/suppliers/domain/ports/supplier-variant.repository";
import { GetSupplierVariantInput } from "../../dtos/supplier-variant/input/get-by-id.input";
import { SupplierVariantOutput } from "../../dtos/supplier-variant/output/supplier-variant.output";
import { SupplierOutputMapper } from "../../mappers/supplier-output.mapper";
import { SupplierVariantNotFoundError } from "../../errors/supplier-variant-not-found.error";

export class GetSupplierVariantUsecase {
  constructor(
    @Inject(SUPPLIER_VARIANT_REPOSITORY)
    private readonly supplierVariantRepo: SupplierVariantRepository,
  ) {}

  async execute(input: GetSupplierVariantInput): Promise<SupplierVariantOutput> {
    const row = await this.supplierVariantRepo.findById(input.supplierId, input.variantId);
    if (!row) {
      throw new NotFoundException(new SupplierVariantNotFoundError().message);
    }

    return SupplierOutputMapper.toSupplierVariantOutput(row);
  }
}
